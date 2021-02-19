/**
 * @dev Simplifies interaction with the Umbra contracts
 */

import { Contract, Wallet } from 'ethers';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { arrayify, hexlify, isHexString, splitSignature } from '@ethersproject/bytes';
import { ContractTransaction, Overrides } from '@ethersproject/contracts';
import { keccak256 } from '@ethersproject/keccak256';
import { JsonRpcSigner } from '@ethersproject/providers';
import { sha256 } from '@ethersproject/sha2';
import { computePublicKey } from '@ethersproject/signing-key';
import { toUtf8Bytes } from '@ethersproject/strings';

import { KeyPair } from './KeyPair';
import { RandomNumber } from './RandomNumber';
import { lookupRecipient } from '../utils/utils';
import { Umbra as UmbraContract, Erc20 as ERC20 } from '@umbra/contracts/typechain';
import * as erc20Abi from '../abi/ERC20.json';
import type {
  Announcement,
  UserAnnouncement,
  ChainConfig,
  EthersProvider,
  SendOverrides,
  ScanOverrides,
} from '../types';

// Umbra.sol ABI
const { abi } = require('@umbra/contracts/artifacts/contracts/Umbra.sol/Umbra.json');

// Mapping from chainId to contract information
const chainConfigs: Record<number, ChainConfig> = {
  // Ropsten
  3: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    startBlock: 9496718,
  },
  // Rinkeby
  4: {
    umbraAddress: '0x264063408fD1bdC703083AE083c813240A024B7f',
    startBlock: 8055954,
  },
  // Local
  1337: {
    umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
    startBlock: 9496718,
  },
};

// Helper method to parse chainConfig input
const parseChainConfig = (chainConfig: ChainConfig | number) => {
  // If a number is provided, verify chainId value is value and pull config from `chainConfigs`
  if (typeof chainConfig === 'number') {
    const validChainIds = Object.keys(chainConfigs);
    if (validChainIds.includes(String(chainConfig))) return chainConfigs[chainConfig];
    throw new Error('Unsupported chain ID provided');
  }
  // Otherwise return the user's provided chain config
  return chainConfig;
};

// Helper method to determine if the provided address is a token or ETH
const isETH = (token: string) => {
  if (token === 'ETH') return true;
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  return getAddress(token) === ETH_ADDRESS; // throws if not a valid address
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
    this.umbraContract = new Contract(
      this.chainConfig.umbraAddress,
      abi,
      provider
    ) as UmbraContract;
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
   * @param overrides Override the payload extension, gas limit, gas price, or nonce
   */
  async send(
    signer: JsonRpcSigner | Wallet,
    token: string,
    amount: BigNumber | string,
    recipientId: string,
    overrides: SendOverrides = {}
  ) {
    // Configure signer
    const txSigner = this.getConnectedSigner(signer);

    // If applicable, check that sender has sufficient token balance. ETH balance is checked on send
    if (!isETH(token)) {
      const tokenContract = new Contract(token, erc20Abi, signer) as ERC20;
      const tokenBalance = await tokenContract.balanceOf(await signer.getAddress());
      if (tokenBalance.lt(amount)) {
        const providedAmount = BigNumber.from(amount).toString();
        const details = `Has ${tokenBalance.toString()} tokens, tried to send ${providedAmount} tokens.`;
        throw new Error(`Insufficient balance to complete transfer. ${details}`);
      }
    }

    // Get toll amount from contract
    const toll = await this.umbraContract.toll();

    // Lookup recipient's public key
    const { spendingPublicKey, viewingPublicKey } = await lookupRecipient(
      recipientId,
      this.provider
    );
    if (!spendingPublicKey || !viewingPublicKey) {
      throw new Error('Could not retrieve public keys for provided recipient ID');
    }
    const spendingKeyPair = new KeyPair(spendingPublicKey);
    const viewingKeyPair = new KeyPair(viewingPublicKey);

    // Generate random number
    const randomNumber = overrides.payloadExtension
      ? new RandomNumber(overrides.payloadExtension)
      : new RandomNumber();

    // Encrypt random number with recipient's public key
    const encrypted = viewingKeyPair.encrypt(randomNumber);

    // Get x,y coordinates of ephemeral private key
    const ephemeralKeyPair = new KeyPair(encrypted.ephemeralPublicKey);
    const ephemeralKeyPairX = computePublicKey(ephemeralKeyPair.publicKeyHex, true);
    const compressedXCoordinate = `0x${ephemeralKeyPairX.slice(4)}`;

    // Compute stealth address
    const stealthKeyPair = spendingKeyPair.mulPublicKey(randomNumber);

    // Get overrides object that removes the payload extension, for use with ethers
    const filteredOverrides = { ...overrides };
    delete filteredOverrides.payloadExtension;

    // Send transaction
    let tx: ContractTransaction;
    if (isETH(token)) {
      const txOverrides = { ...filteredOverrides, value: toll.add(amount) };
      tx = await this.umbraContract
        .connect(txSigner)
        .sendEth(
          stealthKeyPair.address,
          toll,
          compressedXCoordinate,
          encrypted.ciphertext,
          txOverrides
        );
    } else {
      const txOverrides = { ...filteredOverrides, value: toll };
      tx = await this.umbraContract
        .connect(txSigner)
        .sendToken(
          stealthKeyPair.address,
          token,
          amount,
          compressedXCoordinate,
          encrypted.ciphertext,
          txOverrides
        );
    }

    // We do not wait for the transaction to be mined before returning it
    return { tx, stealthKeyPair };
  }

  /**
   * @notice Withdraw ETH or tokens to a specified destination address with a regular transaction
   * @dev The provider used for sending the transaction is the one associated with the Umbra instance
   * @dev This method does not relay meta-transactions and requires signer to have ETH
   * @param spendingPrivateKey Receiver's spending private key
   * @param token Address of token to withdraw
   * @param stealthAddress Stealth address funds were sent to
   * @param destination Address where funds will be withdrawn to
   * @param overrides Override the gas limit, gas price, or nonce
   */
  async withdraw(
    spendingPrivateKey: string,
    token: string,
    stealthAddress: string,
    destination: string,
    overrides: Overrides = {}
  ) {
    // Configure signer
    const wallet = new Wallet(spendingPrivateKey);
    const txSigner = this.getConnectedSigner(wallet);

    if (isETH(token)) {
      // Withdraw ETH
      // Based on gas price, compute how much ETH to transfer to avoid dust
      const ethBalance = await this.provider.getBalance(stealthAddress);
      const gasPrice = BigNumber.from(overrides.gasPrice || (await this.provider.getGasPrice()));
      const gasLimit = BigNumber.from(overrides.gasLimit || '21000');
      const txCost = gasPrice.mul(gasLimit);
      return await txSigner.sendTransaction({
        to: destination,
        value: ethBalance.sub(txCost),
        gasPrice,
        gasLimit,
        nonce: overrides.nonce || undefined, // nonce will be determined by ethers if undefined
      });
    } else {
      // Withdrawing a token
      return await this.umbraContract.connect(txSigner).withdrawToken(destination, overrides);
    }
  }

  /**
   * @notice Withdraw tokens by sending a meta-transaction on behalf of a user
   * @dev The provider used for sending the transaction is the one associated with the Umbra instance
   * @dev This method does not relay meta-transactions and requires signer to have ETH
   * @param signer Signer to send transaction from
   * @param stealthAddr Stealth address funds were sent to
   * @param destination Address where funds will be withdrawn to
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
    sponsor: string,
    sponsorFee: BigNumberish,
    v: number,
    r: string,
    s: string,
    overrides: Overrides = {}
  ) {
    const txSigner = this.getConnectedSigner(signer);
    return await this.umbraContract
      .connect(txSigner)
      .withdrawTokenOnBehalf(stealthAddr, destination, sponsor, sponsorFee, v, r, s, overrides);
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
    const announcementFilter = this.umbraContract.filters.Announcement(
      null,
      null,
      null,
      null,
      null
    );
    const announcements = await this.umbraContract.queryFilter(
      announcementFilter,
      startBlock,
      endBlock
    );

    // Get list of all TokenWithdrawal events
    const withdrawalFilter = this.umbraContract.filters.TokenWithdrawal(null, null, null, null);
    const withdrawalEvents = await this.umbraContract.queryFilter(
      withdrawalFilter,
      startBlock,
      endBlock
    );
    withdrawalEvents; // to silence tsc error

    // Determine which announcements are for the user
    const userAnnouncements = [] as UserAnnouncement[];
    for (let i = 0; i < announcements.length; i += 1) {
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
      if (computedReceivingAddress === receiver) {
        // const promises = ;
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
          token,
          block,
          tx,
          receipt,
        });
      }
    }

    // For each of the user's announcement events, determine if the funds were withdrawn
    // TODO

    return { userAnnouncements /* userWithdrawalEvents, userEvents */ };
  }

  // ======================================= HELPER METHODS ========================================

  /**
   * @notice Asks a user to sign a message to generate two Umbra-specific private keys for them
   * @param signer Signer to sign message from
   * @returns Two KeyPair instances, for the spendingKeyPair and viewingKeyPair
   */
  async generatePrivateKeys(signer: JsonRpcSigner | Wallet) {
    // Base message that will be signed
    const baseMessage =
      'Sign this message to access your Umbra account.\n\nThis signature gives the app access to your funds, so only sign this message for a trusted client!';

    // Append chain ID if not mainnet to mitigate replay attacks
    const chainId = this.provider.network.chainId;
    const message = chainId === 1 ? baseMessage : `${baseMessage}\n\nChain ID: ${chainId}`;

    // Get 65 byte signature from user
    const isValidSignature = (sig: string) => isHexString(sig) && sig.length === 132; // user to verify signature
    let signature: string;
    signature = await signer.signMessage(message); // prompt to user is here, uses eth_sign

    // Fallback to personal_sign if eth_sign isn't supported (e.g. for Status and other wallets)
    if (!isValidSignature(signature)) {
      const userAddress = await signer.getAddress();
      signature = String(
        await this.provider.send('personal_sign', [
          hexlify(toUtf8Bytes(message)),
          userAddress.toLowerCase(),
        ])
      );
    }

    // Verify signature
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
    const spendingPrivateKeyPair = new KeyPair(spendingPrivateKey);
    const stealthFromPrivate = spendingPrivateKeyPair.mulPrivateKey(randomNumber);
    if (!stealthFromPrivate.privateKeyHex) {
      throw new Error('Stealth key pair must have a private key: this should never occur');
    }
    return stealthFromPrivate.privateKeyHex;
  }

  /**
   * @notice Sign a transaction to be used with withdrawTokenOnBehalf
   * @dev Return type is an ethers Signature: { r: string; s: string; _vs: string, recoveryParam: number; v: number; }
   * @param spendingPrivateKey Receiver's spending private key that is doing the signing
   * @param acceptor Withdrawal destination
   * @param sponsor Address of relayer
   * @param sponsorFee Amount sent to sponsor
   */
  static async signWithdraw(
    spendingPrivateKey: string,
    acceptor: string,
    sponsor: string,
    sponsorFee: BigNumberish
  ) {
    const stealthWallet = new Wallet(spendingPrivateKey);
    const digest = keccak256(
      defaultAbiCoder.encode(['address', 'address', 'uint256'], [sponsor, acceptor, sponsorFee])
    );

    const rawSig = await stealthWallet.signMessage(arrayify(digest));
    return splitSignature(rawSig);
  }
}
