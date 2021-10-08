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
  toUtf8Bytes,
  Wallet,
} from '../ethers';
import { KeyPair } from './KeyPair';
import { RandomNumber } from './RandomNumber';
import { blockedStealthAddresses, lookupRecipient } from '../utils/utils';
import { Umbra as UmbraContract, Erc20 as ERC20 } from '@umbra/contracts/typechain';
import { ERC20_ABI } from '../utils/constants';
// prettier-ignore
import type { Announcement, UserAnnouncement, ChainConfig, EthersProvider, SendOverrides, ScanOverrides } from '../types';

// Umbra.sol ABI
const { abi } = require('@umbra/contracts/artifacts/contracts/Umbra.sol/Umbra.json');

// Mapping from chainId to contract information
const umbraAddress = '0xFb2dc580Eed955B528407b4d36FfaFe3da685401'; // same on all supported networks
const chainConfigs: Record<number, ChainConfig> = {
  1: { chainId: 1, umbraAddress, startBlock: 12343914 }, // Mainnet
  4: { chainId: 4, umbraAddress, startBlock: 8505089 }, // Rinkeby
  1337: { chainId: 1337, umbraAddress, startBlock: 8505089 }, // Local
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
  const { umbraAddress, startBlock, chainId } = chainConfig;
  const isValidStartBlock = typeof startBlock === 'number' && startBlock >= 0;
  if (!isValidStartBlock) {
    throw new Error(`Invalid start block provided in chainConfig. Got '${startBlock}'`);
  }
  if (typeof chainId !== 'number' || !Number.isInteger(chainId)) {
    throw new Error(`Invalid chainId provided in chainConfig. Got '${chainId}'`);
  }
  return { umbraAddress: getAddress(umbraAddress), startBlock, chainId };
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

export class Umbra {
  readonly chainConfig: ChainConfig;
  readonly umbraContract: UmbraContract;

  // ========================================= CONSTRUCTOR =========================================
  /**
   * @notice Create Umbra instance to interact with the Umbra contracts
   * @param provider ethers provider to use
   * @param chainConfig The chain configuration of the network or a network ID to use a default one
   */
  constructor(readonly provider: EthersProvider, chainConfig: ChainConfig | number) {
    this.chainConfig = parseChainConfig(chainConfig);
    this.umbraContract = new Contract(this.chainConfig.umbraAddress, abi, provider) as UmbraContract;
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
   * @param signer Signer to send transaction from
   * @param token Address of token to send. Use 'ETH' or '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
   * to send Ether
   * @param amount Amount to send, in units of that token (e.g. use 1e6 to send 1 USDC)
   * @param recipientId Identifier of recipient, e.g. their ENS name
   * @param overrides Override the payload extension, gas limit, gas price, nonce, or advanced mode.
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
    // Configure signer
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

    // Configure signer
    const stealthWallet = new Wallet(spendingPrivateKey); // validates spendingPrivateKey input
    const txSigner = this.getConnectedSigner(stealthWallet);

    // Handle ETH and tokens accordingly. The isEth method also serves to validate the token input
    if (isEth(token)) {
      // Withdraw ETH
      // Based on gas price, compute how much ETH to transfer to avoid dust
      const ethBalance = await this.provider.getBalance(stealthWallet.address); // stealthWallet.address is our stealthAddress
      const gasPrice = BigNumber.from(overrides.gasPrice || (await this.provider.getGasPrice()));
      const gasLimit = BigNumber.from(overrides.gasLimit || '21000');
      const txCost = gasPrice.mul(gasLimit);
      if (txCost.gt(ethBalance)) {
        throw new Error('Stealth address ETH balance is not enough to pay for withdrawal gas cost');
      }
      return txSigner.sendTransaction({
        to: destination,
        value: ethBalance.sub(txCost),
        gasPrice,
        gasLimit,
        nonce: overrides.nonce || undefined, // nonce will be determined by ethers if undefined
      });
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
   * @notice Scans Umbra event logs for funds sent to the specified address
   * @param spendingPublicKey Receiver's spending private key
   * @param viewingPrivateKey Receiver's viewing public key
   * @param overrides Override the start and end block used for scanning
   */
  async scan(spendingPublicKey: string, viewingPrivateKey: string, overrides: ScanOverrides = {}) {
    // Get start and end blocks to scan events for
    const startBlock = overrides.startBlock || this.chainConfig.startBlock;
    const endBlock = overrides.endBlock || 'latest';

    // Get list of all Announcement events
    const announcementFilter = this.umbraContract.filters.Announcement(null, null, null, null, null);
    const announcements = await this.umbraContract.queryFilter(announcementFilter, startBlock, endBlock);

    // Determine which announcements are for the user
    const userAnnouncements = [] as UserAnnouncement[];
    for (let i = 0; i < announcements.length; i += 1) {
      try {
        const event = announcements[i];

        // Extract out event parameters
        const { receiver, amount, token, pkx, ciphertext } = (event.args as unknown) as Announcement;

        // Get y-coordinate of public key from the x-coordinate by solving secp256k1 equation
        const uncompressedPubKey = KeyPair.getUncompressedFromX(pkx);

        // Decrypt to get random number
        const payload = { ephemeralPublicKey: uncompressedPubKey, ciphertext };
        const viewingKeyPair = new KeyPair(viewingPrivateKey);
        const randomNumber = viewingKeyPair.decrypt(payload);

        // Get what our receiving address would be with this random number
        const spendingKeyPair = new KeyPair(spendingPublicKey);
        const computedReceivingAddress = spendingKeyPair.mulPublicKey(randomNumber).address;

        // If our receiving address matches the event's recipient, the transfer was for us
        if (computedReceivingAddress === getAddress(receiver)) {
          const [block, tx, receipt] = await Promise.all([
            event.getBlock(),
            event.getTransaction(),
            event.getTransactionReceipt(),
          ]);
          userAnnouncements.push({
            event,
            randomNumber,
            receiver,
            amount,
            token: getAddress(token),
            block,
            tx,
            receipt,
            isWithdrawn: false,
          });
        }
      } catch (err) {
        // We may reach here if people use the sendToken method improperly, e.g. by passing an invalid pkx, so we'd
        // fail when uncompressing. For now we just silence these
        // console.log('The following event had the below problem while processing:', announcements[i]);
        // console.warn(err);
      }
    }

    // For each of the user's announcement events, determine if the funds were withdrawn
    // TODO

    return { userAnnouncements };
  }

  // ======================================= HELPER METHODS ========================================

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
