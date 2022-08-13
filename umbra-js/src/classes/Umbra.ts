/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import {
  AddressZero,
  arrayify,
  BigNumber,
  BigNumberish,
  Contract,
  ContractTransaction,
  defaultAbiCoder,
  getAddress,
  hexlify,
  isHexString,
  JsonRpcSigner,
  keccak256,
  Overrides,
  sha256,
  splitSignature,
  StaticJsonRpcProvider,
  toUtf8Bytes,
  TransactionResponse,
  Wallet,
} from '../ethers';
import { KeyPair } from './KeyPair';
import { RandomNumber } from './RandomNumber';
import { blockedStealthAddresses, getEthSweepGasInfo, lookupRecipient, assertSupportedAddress } from '../utils/utils';
import { Umbra as UmbraContract, Erc20 as ERC20 } from '@umbra/contracts-core/typechain';
import { ERC20_ABI } from '../utils/constants';
import type { Announcement, ChainConfig, EthersProvider, ScanOverrides, SendOverrides, SubgraphAnnouncement, UserAnnouncement, AnnouncementDetail } from '../types'; // prettier-ignore

// Umbra.sol ABI
const { abi } = require('@umbra/contracts-core/artifacts/contracts/Umbra.sol/Umbra.json');

// Mapping from chainId to contract information
const umbraAddress = '0xFb2dc580Eed955B528407b4d36FfaFe3da685401'; // same on all supported networks
const subgraphs = {
  1: 'https://api.thegraph.com/subgraphs/name/scopelift/umbramainnet',
  4: 'https://api.thegraph.com/subgraphs/name/scopelift/umbrarinkeby',
  10: 'https://api.thegraph.com/subgraphs/name/scopelift/umbraoptimism',
  137: 'https://api.thegraph.com/subgraphs/name/scopelift/umbrapolygon',
  42161: 'https://api.thegraph.com/subgraphs/name/scopelift/umbraarbitrumone',
};

const chainConfigs: Record<number, ChainConfig> = {
  1: { chainId: 1, umbraAddress, startBlock: 12343914, subgraphUrl: subgraphs[1] }, // Mainnet
  4: { chainId: 4, umbraAddress, startBlock: 8505089, subgraphUrl: false }, // Rinkeby Graph disabled due to outage/issues
  10: { chainId: 10, umbraAddress, startBlock: 4069556, subgraphUrl: subgraphs[10] }, // Optimism
  137: { chainId: 137, umbraAddress, startBlock: 20717318, subgraphUrl: subgraphs[137] }, // Polygon
  1337: { chainId: 1337, umbraAddress, startBlock: 8505089, subgraphUrl: false }, // Local
  42161: { chainId: 42161, umbraAddress, startBlock: 7285883, subgraphUrl: subgraphs[42161] }, // Arbitrum
};

/**
 * @notice Helper method to parse chainConfig input and return a valid chain configuration
 * @param chainConfig Supported chainID as number, or custom ChainConfig
 */
const parseChainConfig = (chainConfig: ChainConfig | number) => {
  if (!chainConfig) {
    throw new Error('chainConfig not provided');
  }

  // If a number is provided, verify chainId value is value and pull config from `chainConfigs`
  if (typeof chainConfig === 'number') {
    const validChainIds = Object.keys(chainConfigs);
    if (validChainIds.includes(String(chainConfig))) {
      return chainConfigs[chainConfig];
    }
    throw new Error('Unsupported chain ID provided');
  }

  // Otherwise verify the user's provided chain config is valid and return it
  const { chainId, startBlock, subgraphUrl, umbraAddress } = chainConfig;
  const isValidStartBlock = typeof startBlock === 'number' && startBlock >= 0;

  if (!isValidStartBlock) {
    throw new Error(`Invalid start block provided in chainConfig. Got '${startBlock}'`);
  }
  if (typeof chainId !== 'number' || !Number.isInteger(chainId)) {
    throw new Error(`Invalid chainId provided in chainConfig. Got '${chainId}'`);
  }
  if (subgraphUrl !== false && typeof subgraphUrl !== 'string') {
    throw new Error(`Invalid subgraphUrl provided in chainConfig. Got '${String(subgraphUrl)}'`);
  }

  return { umbraAddress: getAddress(umbraAddress), startBlock, chainId, subgraphUrl };
};

/**
 * @notice Helper method to determine if the provided address is a token or ETH
 * @param token Token address, where both 'ETH' and '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' return true
 */
const isEth = (token: string) => {
  if (token === 'ETH') {
    return true;
  }
  return getAddress(token) === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // throws if `token` is not a valid address
};

/**
 * @notice Returns the Infura RPC URL for the provided chainId and Infura ID
 */
const infuraUrl = (chainId: BigNumberish, infuraId: string) => {
  chainId = BigNumber.from(chainId).toNumber();
  // For Hardhat, we just use the mainnet chain ID to avoid errors in tests, but this doesn't affect anything.
  if (chainId === 1 || chainId === 1337) return `https://mainnet.infura.io/v3/${infuraId}`;
  if (chainId === 4) return `https://rinkeby.infura.io/v3/${infuraId}`;
  if (chainId === 10) return `https://optimism-mainnet.infura.io/v3/${infuraId}`;
  if (chainId === 137) return `https://polygon-mainnet.infura.io/v3/${infuraId}`;
  if (chainId === 42161) return `https://arbitrum-mainnet.infura.io/v3/${infuraId}`;
  throw new Error(`No Infura URL for chainId ${chainId}.`);
};

export class Umbra {
  readonly chainConfig: ChainConfig;
  readonly umbraContract: UmbraContract;
  // Fallback provider, used when a user's provider rejects the transaction. This may happen if the provider from
  // the user's wallet rejects transactions from accounts not associated with that user's wallet (in this case, that
  // means transactions from stealth addresses would be rejected). More info: https://github.com/coinbase/coinbase-wallet-sdk/issues/580
  readonly fallbackProvider: StaticJsonRpcProvider;

  // ========================================= CONSTRUCTOR =========================================
  /**
   * @notice Create Umbra instance to interact with the Umbra contracts
   * @param provider ethers provider to use
   * @param chainConfig The chain configuration of the network or a network ID to use a default one
   */
  constructor(readonly provider: EthersProvider, chainConfig: ChainConfig | number) {
    this.chainConfig = parseChainConfig(chainConfig);
    this.umbraContract = new Contract(this.chainConfig.umbraAddress, abi, provider) as UmbraContract;
    this.fallbackProvider = new StaticJsonRpcProvider(
      infuraUrl(this.chainConfig.chainId, String(process.env.INFURA_ID))
    );
  }

  // ==================================== CONTRACT INTERACTION =====================================

  /**
   * @notice Returns a signer with a valid provider
   * @param signer Signer that may or may not have an associated provider
   */
  getConnectedSigner(signer: JsonRpcSigner | Wallet) {
    return signer.provider ? signer : signer.connect(this.provider);
  }

  /**
   * @notice Send funds to a recipient via Umbra
   * @dev If sending tokens, make sure to handle the approvals before calling this method
   * @dev The provider used for sending the transaction is the one associated with the Umbra instance
   * @dev Fetching the latest toll and including that value on top of `amount` is automatically handled
   * @param signer Signer to send transaction from
   * @param token Address of token to send, excluding toll. Use 'ETH' or '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
   * to send Ether
   * @param amount Amount to send, in units of that token (e.g. use 1e6 to send 1 USDC)
   * @param recipientId Identifier of recipient, e.g. their ENS name
   * @param overrides Override the gas limit, gas price, nonce, or advanced mode.
   * When `advanced` is false it looks for public keys in StealthKeyRegistry, and when true it recovers
   * them from on-chain transaction when true
   */
  async send(
    signer: JsonRpcSigner | Wallet,
    token: string,
    amount: BigNumberish,
    recipientId: string,
    overrides: SendOverrides = {}
  ) {
    await assertSupportedAddress(recipientId);
    const txSigner = this.getConnectedSigner(signer); // signer input validated

    // If applicable, check that sender has sufficient token balance. ETH balance is checked on send. The isEth
    // method also serves to validate the token input
    if (!isEth(token)) {
      const tokenContract = new Contract(token, ERC20_ABI, signer) as ERC20;
      const tokenBalance = await tokenContract.balanceOf(await signer.getAddress());
      if (tokenBalance.lt(amount)) {
        const providedAmount = BigNumber.from(amount).toString();
        const details = `Has ${tokenBalance.toString()} tokens, tried to send ${providedAmount} tokens.`;
        throw new Error(`Insufficient balance to complete transfer. ${details}`);
      }
    }

    // Get toll amount from contract
    const toll = await this.umbraContract.toll();

    // Parse provided overrides
    const localOverrides = { ...overrides }; // avoid mutating the object passed in
    const advanced = localOverrides?.advanced || false;
    const supportPubKey = localOverrides?.supportPubKey || false;
    const supportTxHash = localOverrides?.supportTxHash || false;
    const lookupOverrides = { advanced, supportPubKey, supportTxHash };

    delete localOverrides.advanced;
    delete localOverrides.supportPubKey;
    delete localOverrides.supportTxHash;

    // Lookup recipient's public key
    const { spendingPublicKey, viewingPublicKey } = await lookupRecipient(recipientId, this.provider, lookupOverrides);
    if (!spendingPublicKey || !viewingPublicKey) {
      throw new Error(`Could not retrieve public keys for recipient ID ${recipientId}`);
    }
    const spendingKeyPair = new KeyPair(spendingPublicKey);
    const viewingKeyPair = new KeyPair(viewingPublicKey);

    // Generate random number
    const randomNumber = new RandomNumber();

    // Encrypt random number with recipient's public key
    const encrypted = viewingKeyPair.encrypt(randomNumber);

    // Get x,y coordinates of ephemeral private key
    const { pubKeyXCoordinate } = KeyPair.compressPublicKey(encrypted.ephemeralPublicKey);

    // Compute stealth address
    const stealthKeyPair = spendingKeyPair.mulPublicKey(randomNumber);

    // Ensure that the stealthKeyPair's address is not on the block list
    if (blockedStealthAddresses.includes(stealthKeyPair.address)) throw new Error('Invalid stealth address');

    // Send transaction
    let tx: ContractTransaction;
    if (isEth(token)) {
      const txOverrides = { ...localOverrides, value: toll.add(amount) };
      tx = await this.umbraContract
        .connect(txSigner)
        .sendEth(stealthKeyPair.address, toll, pubKeyXCoordinate, encrypted.ciphertext, txOverrides);
    } else {
      const txOverrides = { ...localOverrides, value: toll };
      tx = await this.umbraContract
        .connect(txSigner)
        .sendToken(stealthKeyPair.address, token, amount, pubKeyXCoordinate, encrypted.ciphertext, txOverrides);
    }

    // We do not wait for the transaction to be mined before returning it
    return { tx, stealthKeyPair };
  }

  /**
   * @notice Withdraw ETH or tokens to a specified destination address with a regular transaction
   * @dev The provider used for sending the transaction is the one associated with the Umbra instance
   * @dev This method does not relay meta-transactions and requires signer to have ETH
   * @param spendingPrivateKey Receiver's spending private key
   * @param token Address of token to withdraw,
   * @param destination Address where funds will be withdrawn to
   * @param overrides Override the gas limit, gas price, or nonce
   */
  async withdraw(spendingPrivateKey: string, token: string, destination: string, overrides: Overrides = {}) {
    // Address input validations
    // token === 'ETH' is valid so we don't verify that, and let ethers verify it during the function call
    destination = getAddress(destination);
    await assertSupportedAddress(destination);

    // Configure signer
    const stealthWallet = new Wallet(spendingPrivateKey); // validates spendingPrivateKey input
    const txSigner = this.getConnectedSigner(stealthWallet);

    // Handle ETH and tokens accordingly. The isEth method also serves to validate the token input
    if (isEth(token)) {
      try {
        // First we attempt to execute the withdrawal using the signer from the user's wallet.
        return await tryEthWithdraw(txSigner, await txSigner.getAddress(), destination, overrides);
      } catch (e) {
        // If that fails, we try again using the fallback provider.
        console.error("Withdrawal with wallet's provider failed, see error below. Retrying with a fallback provider.");
        console.error(e);
        const fallbackSigner = stealthWallet.connect(this.fallbackProvider);
        return await tryEthWithdraw(fallbackSigner, await txSigner.getAddress(), destination, overrides);
      }
    } else {
      // Withdrawing a token
      return await this.umbraContract.connect(txSigner).withdrawToken(destination, token, overrides);
    }
  }

  /**
   * @notice Withdraw tokens by sending a meta-transaction on behalf of a user
   * @dev The provider used for sending the transaction is the one associated with the Umbra instance
   * @dev This method does not relay meta-transactions and requires signer to have ETH
   * @param signer Signer to send transaction from
   * @param stealthAddr Stealth address funds were sent to
   * @param destination Address where funds will be withdrawn to
   * @param token Address of token to withdraw
   * @param sponsor Address that receives sponsorFee
   * @param sponsorFee Fee for relayer
   * @param v v-component of signature
   * @param r r-component of signature
   * @param s s-component of signature
   * @param overrides Override the gas limit, gas price, or nonce
   */
  async withdrawOnBehalf(
    signer: JsonRpcSigner | Wallet,
    stealthAddr: string,
    destination: string,
    token: string,
    sponsor: string,
    sponsorFee: BigNumberish,
    v: number,
    r: string,
    s: string,
    overrides: Overrides = {}
  ) {
    // Address input validations
    stealthAddr = getAddress(stealthAddr);
    destination = getAddress(destination);
    token = getAddress(token);
    sponsor = getAddress(sponsor);
    await assertSupportedAddress(destination);

    // Send withdraw transaction
    const txSigner = this.getConnectedSigner(signer);
    return await this.umbraContract
      .connect(txSigner)
      .withdrawTokenOnBehalf(stealthAddr, destination, token, sponsor, sponsorFee, v, r, s, overrides);
  }

  /**
   * @notice Withdraw tokens by relaying a user's meta-transaction
   */
  async relayWithdrawOnBehalf() {
    // TODO
  }

  /**
   * @notice Fetches all Umbra event logs using The Graph, if available, falling back to RPC if not
   * @param overrides Override the start and end block used for scanning; ignored if using The Graph
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, and txhash
   */
  async fetchAllAnnouncements(overrides: ScanOverrides = {}): Promise<AnnouncementDetail[]> {
    // Get start and end blocks to scan events for
    const startBlock = overrides.startBlock || this.chainConfig.startBlock;
    const endBlock = overrides.endBlock || 'latest';

    // Try querying events using the Graph, fallback to querying logs.
    // The Graph fetching uses the browser's `fetch` method to query the subgraph, so we check
    // that window is defined first to avoid trying to use fetch in node environments
    if (typeof window !== 'undefined' && this.chainConfig.subgraphUrl) {
      try {
        const subgraphAnnouncements = await this.fetchAllAnnouncementsFromSubgraph(startBlock, endBlock);
        // Map the subgraph amount field from string to BigNumber
        return subgraphAnnouncements.map((x) => ({ ...x, amount: BigNumber.from(x.amount) }));
      } catch (err) {
        return this.fetchAllAnnouncementFromLogs(startBlock, endBlock);
      }
    }

    return this.fetchAllAnnouncementFromLogs(startBlock, endBlock);
  }

  /**
   * @notice Fetches all Umbra event logs using The Graph
   * @dev Currently ignores the start and end block parameters and returns all events; this may change in a
   * future version
   * @param startBlock Ignored
   * @param endBlock Ignored
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, txhash, and the subgraph identifier
   */
  async fetchAllAnnouncementsFromSubgraph(
    startBlock: string | number,
    endBlock: string | number
  ): Promise<SubgraphAnnouncement[]> {
    if (!this.chainConfig.subgraphUrl) {
      throw new Error('Subgraph URL must be defined to fetch via subgraph');
    }

    // TODO: We're ignoring these overrides for The Graph. Is this intentional? Should we remove the parameters,
    // or update so it uses them?
    startBlock;
    endBlock;

    // Query subgraph
    const subgraphAnnouncements: SubgraphAnnouncement[] = await recursiveGraphFetch(
      this.chainConfig.subgraphUrl,
      'announcementEntities',
      (filter: string) => `{
        announcementEntities(${filter}) {
          amount
          block
          ciphertext
          from
          id
          pkx
          receiver
          timestamp
          token
          txHash
        }
      }`
    );

    return subgraphAnnouncements;
  }

  /**
   * @notice Fetches all Umbra event logs between specified blocks using the standard RPC provider
   * @param startBlock Block number to begin scanning for events
   * @param endBlock Block number to end scanning for events, or 'latest'
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, and txhash
   */
  async fetchAllAnnouncementFromLogs(
    startBlock: string | number,
    endBlock: string | number
  ): Promise<AnnouncementDetail[]> {
    // Fetching announcements from logs is not simple on L2s because the network produces too
    // many blocks too quickly. If this is attempted, we throw an error.
    const errMsg = (network: string) => `Cannot fetch Announcements from logs on ${network}, please try again later`;
    if (this.chainConfig.chainId === 10) throw new Error(errMsg('Optimism'));
    if (this.chainConfig.chainId === 137) throw new Error(errMsg('Polygon'));

    // Get list of all Announcement events
    const announcementFilter = this.umbraContract.filters.Announcement(null, null, null, null, null);
    const announcementEvents = await this.umbraContract.queryFilter(announcementFilter, startBlock, endBlock);

    const announcements = await Promise.all(
      announcementEvents.map(async (event) => {
        // Extract out event parameters
        const announcement = (event.args as unknown) as Announcement;
        const { receiver, amount, token, ciphertext, pkx } = announcement;

        const [block, tx] = await Promise.all([event.getBlock(), event.getTransaction()]);
        return {
          amount,
          block: block.number.toString(),
          ciphertext,
          from: tx.from,
          receiver,
          pkx,
          timestamp: String(block.timestamp),
          token: getAddress(token),
          txHash: event.transactionHash,
        };
      })
    );

    return announcements;
  }

  /**
   * @notice Scans all Umbra event logs for funds sent to the specified address
   * @dev This is a convenience method that first runs `fetchAllAnnouncements`, then filters them through
   * the static helper `isAnnouncementForUser`. The latter is CPU intensive and this method will block while
   * all announcements are processed. To avoid performance issues, you may need to run fetching and filtering
   * steps separately, and use chunking, web workers, or other threading strategies.
   * @param spendingPublicKey Receiver's spending private key
   * @param viewingPrivateKey Receiver's viewing public key
   * @param overrides Override the start and end block used for scanning
   */
  async scan(spendingPublicKey: string, viewingPrivateKey: string, overrides: ScanOverrides = {}) {
    const announcements = await this.fetchAllAnnouncements(overrides);

    const userAnnouncements = announcements.reduce((userAnns, ann) => {
      const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = ann;
      const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(spendingPublicKey, viewingPrivateKey, ann);
      const token = getAddress(tokenAddr); // ensure checksummed address
      const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
      if (isForUser) userAnns.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
      return userAnns;
    }, [] as UserAnnouncement[]);

    return { userAnnouncements };
  }

  /**
   * @notice If the provided announcement is for the user with the specified keys, return true and the decoded
   * random number
   * @param spendingPublicKey Receiver's spending private key
   * @param viewingPrivateKey Receiver's viewing public key
   * @param announcement Parameters emitted in the announcement event
   */
  static isAnnouncementForUser(spendingPublicKey: string, viewingPrivateKey: string, announcement: Announcement) {
    try {
      // Get y-coordinate of public key from the x-coordinate by solving secp256k1 equation
      const { receiver, pkx, ciphertext } = announcement;
      const uncompressedPubKey = KeyPair.getUncompressedFromX(pkx);

      // Decrypt to get random number
      const payload = { ephemeralPublicKey: uncompressedPubKey, ciphertext };
      const viewingKeyPair = new KeyPair(viewingPrivateKey);
      const randomNumber = viewingKeyPair.decrypt(payload);

      // Get what our receiving address would be with this random number
      const spendingKeyPair = new KeyPair(spendingPublicKey);
      const computedReceivingAddress = spendingKeyPair.mulPublicKey(randomNumber).address;

      // If our receiving address matches the event's recipient, the transfer was for the user with the specified keys
      return { isForUser: computedReceivingAddress === getAddress(receiver), randomNumber };
    } catch (err) {
      // We may reach here if people use the sendToken method improperly, e.g. by passing an invalid pkx, so we'd
      // fail when uncompressing. For now we just silently ignore these and return false
      return { isForUser: false, randomNumber: '' };
    }
  }

  /**
   * @notice Asks a user to sign a message to generate two Umbra-specific private keys for them
   * @dev Only safe for use with wallets that implement deterministic ECDSA signatures as specified by RFC 6979 (which
   * might be all of them?)
   * @param signer Signer to sign message from
   * @returns Two KeyPair instances, for the spendingKeyPair and viewingKeyPair
   */
  async generatePrivateKeys(signer: JsonRpcSigner | Wallet) {
    // Base message that will be signed
    const baseMessage = 'Sign this message to access your Umbra account.\n\nOnly sign this message for a trusted client!'; // prettier-ignore

    // Append chain ID if not mainnet to mitigate replay attacks
    const { chainId } = await this.provider.getNetwork();
    const message = chainId === 1 ? baseMessage : `${baseMessage}\n\nChain ID: ${chainId}`;

    // Get 65 byte signature from user using personal_sign
    const userAddress = await signer.getAddress();
    const formattedMessage = hexlify(toUtf8Bytes(message));
    const signature = String(await this.provider.send('personal_sign', [formattedMessage, userAddress.toLowerCase()]));

    // If a user can no longer access funds because their wallet was using eth_sign before this update, stand up a
    // special "fund recovery login page" which uses the commented out code below to sign with eth_sign
    //     const signature = await signer.signMessage(message);

    // Verify signature
    const isValidSignature = (sig: string) => isHexString(sig) && sig.length === 132;
    if (!isValidSignature(signature)) {
      throw new Error(`Invalid signature: ${signature}`);
    }

    // Split hex string signature into two 32 byte chunks
    const startIndex = 2; // first two characters are 0x, so skip these
    const length = 64; // each 32 byte chunk is in hex, so 64 characters
    const portion1 = signature.slice(startIndex, startIndex + length);
    const portion2 = signature.slice(startIndex + length, startIndex + length + length);
    const lastByte = signature.slice(signature.length - 2);

    if (`0x${portion1}${portion2}${lastByte}` !== signature) {
      throw new Error('Signature incorrectly generated or parsed');
    }

    // Hash the signature pieces to get the two private keys
    const spendingPrivateKey = sha256(`0x${portion1}`);
    const viewingPrivateKey = sha256(`0x${portion2}`);

    // Create KeyPair instances from the private keys and return them
    const spendingKeyPair = new KeyPair(spendingPrivateKey);
    const viewingKeyPair = new KeyPair(viewingPrivateKey);
    return { spendingKeyPair, viewingKeyPair };
  }

  // ==================================== STATIC HELPER METHODS ====================================

  /**
   * @notice Helper method to return the stealth wallet from a receiver's private key and a random number
   * @param spendingPrivateKey Receiver's spending private key
   * @param randomNumber Number to multiply by, as class RandomNumber or hex string with 0x prefix
   */
  static computeStealthPrivateKey(spendingPrivateKey: string, randomNumber: RandomNumber | string) {
    const spendingPrivateKeyPair = new KeyPair(spendingPrivateKey); // validates spendingPrivateKey
    const stealthFromPrivate = spendingPrivateKeyPair.mulPrivateKey(randomNumber); // validates randomNumber
    if (!stealthFromPrivate.privateKeyHex) {
      throw new Error('Stealth key pair must have a private key: this should never occur');
    }
    return stealthFromPrivate.privateKeyHex;
  }

  /**
   * @notice Sign a transaction to be used with withdrawTokenOnBehalf
   * @dev Return type is an ethers Signature: { r: string; s: string; _vs: string, recoveryParam: number; v: number; }
   * @param spendingPrivateKey Receiver's spending private key that is doing the signing
   * @param chainId Chain ID where contract is deployed
   * @param contract Umbra contract address that withdrawal transaction will be sent to
   * @param acceptor Withdrawal destination
   * @param token Address of token to withdraw
   * @param sponsor Address of relayer
   * @param sponsorFee Amount sent to sponsor
   * @param hook Address of post withdraw hook contract
   * @param data Call data to be past to post withdraw hook
   */
  static async signWithdraw(
    spendingPrivateKey: string,
    chainId: number,
    contract: string,
    acceptor: string,
    token: string,
    sponsor: string,
    sponsorFee: BigNumberish,
    hook: string = AddressZero,
    data = '0x'
  ) {
    // Address input validations
    contract = getAddress(contract);
    acceptor = getAddress(acceptor);
    sponsor = getAddress(sponsor);
    token = getAddress(token);
    hook = getAddress(hook);

    // Validate chainId
    if (typeof chainId !== 'number' || !Number.isInteger(chainId)) {
      throw new Error(`Invalid chainId provided in chainConfig. Got '${chainId}'`);
    }

    // Validate the data string
    if (typeof data !== 'string' || !isHexString(data)) {
      throw new Error('Data string must be null or in hex format with 0x prefix');
    }

    const stealthWallet = new Wallet(spendingPrivateKey);
    const digest = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'address', 'address', 'address', 'address', 'uint256', 'address', 'bytes'],
        [chainId, contract, acceptor, token, sponsor, sponsorFee, hook, data]
      )
    );
    const rawSig = await stealthWallet.signMessage(arrayify(digest));
    return splitSignature(rawSig);
  }
}

// ============================== PRIVATE, FUNCTIONAL HELPER METHODS ==============================

/**
 * @notice Generic method to recursively grab every 'page' of results
 * @dev NOTE: the query MUST return the ID field
 * @dev Modifies from: https://github.com/dcgtc/dgrants/blob/f5a783524d0b56eea12c127b2146fba8fb9273b4/app/src/utils/utils.ts#L443
 * @dev Relevant docs: https://thegraph.com/docs/developer/graphql-api#example-3
 * @dev Lives outside of the class instance because user's should not need access to this method
 * @dev TODO support node.js by replacing reliance on browser's fetch module with https://github.com/paulmillr/micro-ftch
 * @param url the url we will recursively fetch from
 * @param key the key in the response object which holds results
 * @param query a function which will return the query string (with the page in place)
 * @param before the current array of objects
 */
async function recursiveGraphFetch(
  url: string,
  key: string,
  query: (filter: string) => string,
  before: any[] = []
): Promise<any[]> {
  // retrieve the last ID we collected to use as the starting point for this query
  const fromId = before.length ? (before[before.length - 1].id as string | number) : false;

  // Fetch this 'page' of results - please note that the query MUST return an ID
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query(`
        first: 1000,
        where: {
          ${fromId ? `id_gt: "${fromId}",` : ''}
        }
      `),
    }),
  });

  // Resolve the json
  const json = await res.json();

  // If there were results on this page then query the next page, otherwise return the data
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  if (!json.data[key].length) return [...before];
  else return await recursiveGraphFetch(url, key, query, [...before, ...json.data[key]]);
  /* eslint-enable @typescript-eslint/no-unsafe-return */
}

/**
 * @notice Tries withdrawing ETH from a stealth address on behalf of a user
 * @dev Attempts multiple retries before returning an error. Retries only occur if there was an
 * insufficient funds error due to changing L1 gas prices on Optimism. Retry attempts occur quickly.
 */
async function tryEthWithdraw(
  signer: JsonRpcSigner | Wallet,
  from: string, // signer.getAddress() is async, so pass this to reduce number of calls
  to: string,
  overrides: Overrides = {},
  retryCount = 0
): Promise<TransactionResponse> {
  try {
    if (retryCount === 20) throw new Error("Failed to estimate Optimism's L1 Fee, please try again later");
    const sweepInfo = await getEthSweepGasInfo(from, to, signer.provider as EthersProvider, overrides);
    const { gasPrice, gasLimit, txCost, fromBalance, ethToSend, chainId } = sweepInfo;
    if (txCost.gt(fromBalance)) {
      throw new Error('Stealth address ETH balance is not enough to pay for withdrawal gas cost');
    }

    // If on Optimism, reduce the value sent to add margin for the variable L1 gas costs. The margin added is
    // proportional to the retryCount, i.e. the more retries, the more margin is added, capped at 20% added cost
    let adjustedValue = ethToSend;
    if (chainId === 10) {
      const costWithMargin = txCost.mul(100 + Math.min(retryCount, 20)).div(100);
      adjustedValue = adjustedValue.sub(costWithMargin);
    }

    const tx = await signer.sendTransaction({ to, value: adjustedValue, gasPrice, gasLimit });
    return tx;
  } catch (e: any) {
    // Retry if the error was insufficient funds, otherwise throw the error
    if (!e.stack.includes('insufficient funds')) throw e;
    console.log('e', e);
    console.warn(`failed with "insufficient funds for gas * price + value", retry attempt ${retryCount}...`);
    return await tryEthWithdraw(signer, from, to, overrides, retryCount + 1);
  }
}
