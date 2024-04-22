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
  Zero,
} from '../ethers';
import { KeyPair } from './KeyPair';
import { RandomNumber } from './RandomNumber';
import {
  invalidStealthAddresses,
  getEthSweepGasInfo,
  lookupRecipient,
  assertSupportedAddress,
  checkSupportedAddresses,
  getBlockNumberUserRegistered,
} from '../utils/utils';
import { Umbra as UmbraContract, Umbra__factory, ERC20__factory } from '../typechain';
import { ETH_ADDRESS, UMBRA_BATCH_SEND_ABI } from '../utils/constants';
import type { Announcement, ChainConfig, EthersProvider, GraphFilterOverride, ScanOverrides, SendOverrides, SubgraphAnnouncement, UserAnnouncement, AnnouncementDetail, SendBatch, SendData} from '../types'; // prettier-ignore

// Mapping from chainId to contract information
const umbraAddress = '0xFb2dc580Eed955B528407b4d36FfaFe3da685401'; // same on all supported networks
const batchSendAddress = '0xDbD0f5EBAdA6632Dde7d47713ea200a7C2ff91EB'; // same on all supported networks
const subgraphs = {
  1: String(process.env.MAINNET_SUBGRAPH_URL),
  10: String(process.env.OPTIMISM_SUBGRAPH_URL),
  100: String(process.env.GNOSIS_CHAIN_SUBGRAPH_URL),
  137: String(process.env.POLYGON_SUBGRAPH_URL),
  8453: String(process.env.BASE_SUBGRAPH_URL),
  42161: String(process.env.ARBITRUM_ONE_SUBGRAPH_URL),
  11155111: String(process.env.SEPOLIA_SUBGRAPH_URL),
};

const chainConfigs: Record<number, ChainConfig> = {
  1: { chainId: 1, umbraAddress, batchSendAddress, startBlock: 12343914, subgraphUrl: subgraphs[1] }, // Mainnet
  10: { chainId: 10, umbraAddress, batchSendAddress, startBlock: 4069556, subgraphUrl: subgraphs[10] }, // Optimism
  100: { chainId: 100, umbraAddress, batchSendAddress, startBlock: 28237950, subgraphUrl: subgraphs[100] }, // Gnosis Chain
  137: { chainId: 137, umbraAddress, batchSendAddress, startBlock: 20717318, subgraphUrl: subgraphs[137] }, // Polygon
  1337: { chainId: 1337, umbraAddress, batchSendAddress, startBlock: 8505089, subgraphUrl: false }, // Local
  8453: { chainId: 8453, umbraAddress, batchSendAddress, startBlock: 10761374, subgraphUrl: subgraphs[8453] }, // Base
  42161: { chainId: 42161, umbraAddress, batchSendAddress, startBlock: 7285883, subgraphUrl: subgraphs[42161] }, // Arbitrum
  11155111: {
    chainId: 11155111,
    umbraAddress,
    batchSendAddress,
    startBlock: 3590825,
    subgraphUrl: subgraphs[11155111],
  }, // Sepolia
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
  const { chainId, startBlock, subgraphUrl, umbraAddress, batchSendAddress } = chainConfig;
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

  return {
    umbraAddress: getAddress(umbraAddress),
    batchSendAddress: batchSendAddress ? getAddress(batchSendAddress) : null,
    startBlock,
    chainId,
    subgraphUrl,
  };
};

/**
 * @notice Helper method to determine if the provided address is a token or ETH
 * @param token Token address, where both 'ETH' and '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' return true
 */
const isEth = (token: string) => {
  if (token === 'ETH') {
    return true;
  }
  return getAddress(token) === ETH_ADDRESS; // throws if `token` is not a valid address
};

/**
 * @notice Returns an RPC URL for the provided chainId
 */
const rpcUrlFromChain = (chainId: BigNumberish) => {
  chainId = BigNumber.from(chainId).toNumber();
  // For Hardhat, we just use the mainnet chain ID to avoid errors in tests, but this doesn't affect anything.
  if (chainId === 1 || chainId === 1337) return String(process.env.MAINNET_RPC_URL);
  if (chainId === 10) return String(process.env.OPTIMISM_RPC_URL);
  if (chainId === 100) return String(process.env.GNOSIS_CHAIN_RPC_URL);
  if (chainId === 137) return String(process.env.POLYGON_RPC_URL);
  if (chainId === 8453) return String(process.env.BASE_RPC_URL);
  if (chainId === 42161) return String(process.env.ARBITRUM_ONE_RPC_URL);
  if (chainId === 11155111) return String(process.env.SEPOLIA_RPC_URL);
  throw new Error(`No RPC URL for chainId ${chainId}.`);
};

export class Umbra {
  readonly chainConfig: ChainConfig;
  readonly umbraContract: UmbraContract;
  readonly batchSendContract;
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
    this.umbraContract = Umbra__factory.connect(this.chainConfig.umbraAddress, provider);
    if (this.chainConfig.batchSendAddress) {
      this.batchSendContract = new Contract(this.chainConfig.batchSendAddress, UMBRA_BATCH_SEND_ABI, provider);
    }
    this.fallbackProvider = new StaticJsonRpcProvider(rpcUrlFromChain(this.chainConfig.chainId));
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
    // Check that recipient is valid.
    await assertSupportedAddress(recipientId);

    // Check that the sender has sufficient balance.
    await assertSufficientBalance(signer, token, BigNumber.from(amount));

    // Get toll amount from contract.
    const toll = await this.umbraContract.toll();

    // Parse provided overrides.
    const { localOverrides, lookupOverrides } = parseOverrides(overrides);

    // Prepare data for the send.
    const { stealthKeyPair, pubKeyXCoordinate, encrypted } = await this.prepareSend(recipientId, lookupOverrides);
    assertValidStealthAddress(stealthKeyPair.address);

    // Send transaction.
    const txSigner = this.getConnectedSigner(signer); // signer input validated
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

  async batchSend(signer: JsonRpcSigner | Wallet, sends: SendBatch[], overrides: SendOverrides = {}) {
    if (!this.batchSendContract) {
      throw new Error('Batch send is not supported on this network');
    }

    // Check that all recipients are valid.
    const recipients = new Set(sends.map((send) => send.address));
    await Promise.all([...recipients].map(assertSupportedAddress));

    // Check that the sender has sufficient balance for all tokens.
    const tokenSum = new Map<string, BigNumber>();
    for (const send of sends) {
      const token = send.token;
      const amount = BigNumber.from(send.amount);
      tokenSum.set(token, tokenSum.get(token)?.add(amount) || amount);
    }

    await Promise.all(
      [...tokenSum.keys()].map((token) => assertSufficientBalance(signer, token, tokenSum.get(token) as BigNumber))
    );

    // Get toll amount from contract.
    const toll = await this.umbraContract.toll();

    // Parse provided overrides.
    const { localOverrides, lookupOverrides } = parseOverrides(overrides);

    // Prepare data for each send.
    const sendInfo = await Promise.all(sends.map((send) => this.prepareSend(send.address, lookupOverrides)));

    // Send transaction.
    const valueAmount = toll.mul(sendInfo.length).add(tokenSum.get(ETH_ADDRESS) || Zero);
    const sendData: SendData[] = sendInfo.map((info, index) => {
      const receiver = info.stealthKeyPair.address;
      const token = sends[index].token;
      const amount = BigNumber.from(sends[index].amount);
      assertValidStealthAddress(receiver);

      return {
        receiver: receiver,
        tokenAddr: token,
        amount: amount,
        pkx: info.pubKeyXCoordinate,
        ciphertext: info.encrypted.ciphertext,
      };
    });

    // Sort by token addresses
    const sortedData: SendData[] = sendData.sort((a, b) => a.tokenAddr.localeCompare(b.tokenAddr));

    // Send transaction
    const txOverrides = { ...localOverrides, value: valueAmount };
    const tx: ContractTransaction = await this.batchSendContract
      .connect(this.getConnectedSigner(signer))
      .batchSend(toll, sortedData, txOverrides);

    // We do not wait for the transaction to be mined before returning it
    return { tx, stealthKeyPairs: sendInfo.map((info) => info.stealthKeyPair) };
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
  ): Promise<TransactionResponse> {
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
   * @notice Fetches all Umbra event logs using Goldsky, if available, falling back to RPC if not
   * @param overrides Override the start and end block used for scanning;
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, and txhash
   */
  async *fetchAllAnnouncements(overrides: ScanOverrides = {}): AsyncGenerator<AnnouncementDetail[]> {
    // Get start and end blocks to scan events for
    const startBlock = overrides.startBlock || this.chainConfig.startBlock;
    const endBlock = overrides.endBlock || 'latest';

    const filterSupportedAddresses = async (announcements: AnnouncementDetail[]) => {
      // Check if all senders and receiver addresses are supported.
      const addrsToCheck = announcements.map((a) => [a.receiver, a.from]).flat();
      const isSupportedList = await checkSupportedAddresses(addrsToCheck);
      const supportedAddrs = new Set([...addrsToCheck.filter((_, i) => isSupportedList[i])]);

      const filtered = announcements.map((announcement) => {
        const isReceiverSupported = supportedAddrs.has(announcement.receiver);
        const isFromSupported = supportedAddrs.has(announcement.from);
        return isReceiverSupported && isFromSupported ? announcement : null;
      });

      return filtered.filter((i) => i !== null) as AnnouncementDetail[];
    };

    // Try querying events using Goldsky, fallback to querying logs.
    if (this.chainConfig.subgraphUrl) {
      try {
        for await (const subgraphAnnouncements of this.fetchAllAnnouncementsFromSubgraph(startBlock, endBlock)) {
          // Map the subgraph amount field from string to BigNumber
          const announcements = subgraphAnnouncements.map((x) => ({ ...x, amount: BigNumber.from(x.amount) }));
          yield await filterSupportedAddresses(announcements);
        }
      } catch (err) {
        const announcements = await this.fetchAllAnnouncementFromLogs(startBlock, endBlock);
        yield await filterSupportedAddresses(announcements);
      }
    } else {
      const announcements = await this.fetchAllAnnouncementFromLogs(startBlock, endBlock);
      yield await filterSupportedAddresses(announcements);
    }
  }

  /**
   * @notice Fetches Umbra event logs starting from the block user registered their stealth keys in using
   * Goldsky, if available, falling back to RPC if not
   * @param overrides Override the start and end block used for scanning;
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, and txhash
   */
  async *fetchSomeAnnouncements(
    Signer: JsonRpcSigner,
    address: string,
    overrides: ScanOverrides = {}
  ): AsyncGenerator<AnnouncementDetail[]> {
    const registeredBlockNumber = await getBlockNumberUserRegistered(address, Signer.provider);
    // Get start and end blocks to scan events for
    const startBlock = overrides.startBlock || registeredBlockNumber || this.chainConfig.startBlock;
    const endBlock = overrides.endBlock || 'latest';
    for await (const announcementBatch of this.fetchAllAnnouncements({ startBlock, endBlock })) {
      yield announcementBatch;
    }
  }

  /**
   * @notice Fetches all Umbra event logs using Goldsky
   * @param startBlock Scanning start block
   * @param endBlock Scannding end block
   * @returns A list of Announcement events supplemented with additional metadata, such as the sender, block,
   * timestamp, txhash, and the subgraph identifier
   */
  async *fetchAllAnnouncementsFromSubgraph(
    startBlock: string | number,
    endBlock: string | number
  ): AsyncGenerator<SubgraphAnnouncement[]> {
    if (!this.chainConfig.subgraphUrl) {
      throw new Error('Subgraph URL must be defined to fetch via subgraph');
    }

    // Query subgraph
    for await (const subgraphAnnouncements of recursiveGraphFetch(
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
    }`,
      [],
      {
        startBlock,
        endBlock,
      }
    )) {
      yield subgraphAnnouncements;
    }
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
    if (this.chainConfig.chainId === 8453) throw new Error(errMsg('Base'));

    // Get list of all Announcement events
    const announcementFilter = this.umbraContract.filters.Announcement(null, null, null, null, null);
    const announcementEvents = await this.umbraContract.queryFilter(announcementFilter, startBlock, endBlock);

    const announcements = await Promise.all(
      announcementEvents.map(async (event) => {
        // Extract out event parameters
        const announcement = event.args as unknown as Announcement;
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
    const userAnnouncements: UserAnnouncement[] = [];
    for await (const announcementsBatch of this.fetchAllAnnouncements(overrides)) {
      for (const announcement of announcementsBatch) {
        const { amount, from, receiver, timestamp, token: tokenAddr, txHash } = announcement;
        const { isForUser, randomNumber } = Umbra.isAnnouncementForUser(
          spendingPublicKey,
          viewingPrivateKey,
          announcement
        );
        const token = getAddress(tokenAddr); // ensure checksummed address
        const isWithdrawn = false; // we always assume not withdrawn and leave it to the caller to check
        if (isForUser)
          userAnnouncements.push({ randomNumber, receiver, amount, token, from, txHash, timestamp, isWithdrawn });
      }
    }

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

  async prepareSend(recipientId: string, lookupOverrides: SendOverrides = {}) {
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

    return { stealthKeyPair, pubKeyXCoordinate, encrypted };
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
async function* recursiveGraphFetch(
  url: string,
  key: string,
  query: (filter: string) => string,
  before: any[] = [],
  overrides?: GraphFilterOverride
): AsyncGenerator<any[]> {
  // retrieve the last ID we collected to use as the starting point for this query
  const fromId = before.length ? (before[before.length - 1].id as string | number) : false;
  let startBlockFilter = '';
  let endBlockFilter = '';
  const startBlock = overrides?.startBlock ? overrides.startBlock.toString() : '';
  const endBlock = overrides?.endBlock ? overrides?.endBlock.toString() : '';

  if (startBlock) {
    startBlockFilter = `block_gte: "${startBlock}",`;
  }

  if (endBlock && endBlock !== 'latest') {
    endBlockFilter = `block_lte: "${endBlock}",`;
  }
  // Fetch this 'page' of results - please note that the query MUST return an ID
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query(`
        first: 1000,
        orderBy: id,
        orderDirection: desc,
        where: {
          ${fromId ? `id_lt: "${fromId}",` : ''}
          ${startBlockFilter}
          ${endBlockFilter}
        }
      `),
    }),
  });

  // Resolve the json
  const json = await res.json();

  // If there were results on this page yield the results then query the next page, otherwise do nothing.
  if (json.data[key].length) {
    yield json.data[key]; // yield the data for this page
    yield* recursiveGraphFetch(url, key, query, [...before, ...json.data[key]], overrides); // yield the data for the next pages
  }
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

    // If on Optimismj or Base, reduce the value sent to add margin for the variable L1 gas costs. The margin added is
    // proportional to the retryCount, i.e. the more retries, the more margin is added, capped at 20% added cost
    let adjustedValue = ethToSend;
    if (chainId === 10 || chainId === 8453) {
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

// The function below is exported for testing purposes only and should not be used outside of this file.
export async function assertSufficientBalance(signer: JsonRpcSigner | Wallet, token: string, tokenAmount: BigNumber) {
  // If applicable, check that sender has sufficient token balance. ETH balance is checked on send. The isEth
  // method also serves to validate the token input
  if (!isEth(token)) {
    const tokenContract = ERC20__factory.connect(token, signer);
    const tokenBalance = await tokenContract.balanceOf(await signer.getAddress());
    if (tokenBalance.lt(tokenAmount)) {
      const providedAmount = tokenAmount.toString();
      const details = `Has ${tokenBalance.toString()} tokens, tried to send ${providedAmount} tokens.`;
      throw new Error(`Insufficient balance to complete transfer. ${details}`);
    }
  }
  return true;
}

export function assertValidStealthAddress(stealthAddress: string) {
  // Ensure that the stealthKeyPair's address is not on the block list
  if (invalidStealthAddresses.includes(stealthAddress)) throw new Error(`Invalid stealth address: ${stealthAddress}`);
}

/**
 * @notice Helper method to return parsed localOverrides and LookupOverrides
 * @param overrides Override the gas limit, gas price, nonce, or advanced mode.
 * When `advanced` is false it looks for public keys in StealthKeyRegistry, and when true it recovers
 * them from on-chain transaction when true
 */
export function parseOverrides(overrides: SendOverrides = {}): {
  localOverrides: SendOverrides;
  lookupOverrides: Pick<SendOverrides, 'advanced' | 'supportPubKey' | 'supportTxHash'>;
} {
  const localOverrides = { ...overrides }; // avoid mutating the object passed in
  const advanced = localOverrides?.advanced || false;
  const supportPubKey = localOverrides?.supportPubKey || false;
  const supportTxHash = localOverrides?.supportTxHash || false;
  const lookupOverrides = { advanced, supportPubKey, supportTxHash };

  delete localOverrides.advanced;
  delete localOverrides.supportPubKey;
  delete localOverrides.supportTxHash;

  return { localOverrides, lookupOverrides };
}
