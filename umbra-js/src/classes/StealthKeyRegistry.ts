/**
 * @dev Simplifies interactions with the StealthKeyRegistry contract
 */

import { KeyPair } from '../classes/KeyPair';
import { StealthKeyRegistry as StealthKeyRegistryContract } from '../typechain';
import { Contract, JsonRpcSigner, TransactionResponse } from '../ethers';
import type { EthersProvider } from '../types';

// Address of the StealthKeyRegistry is the same on all supported networks
const stealthKeyRegistry = '0x31fe56609C65Cd0C510E7125f051D440424D38f3';
const abi = [
  'event StealthKeyChanged(address indexed registrant, uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function STEALTHKEYS_TYPEHASH() view returns (bytes32)',
  'function setStealthKeys(uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
  'function setStealthKeysOnBehalf(address registrant, uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey, uint8 v, bytes32 r, bytes32 s)',
  'function stealthKeys(address registrant) view returns (uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
];

export class StealthKeyRegistry {
  // Instance of the StealthKeyRegistry contract
  // Prefixed with _ to indicate you shouldn't need to access this directly, but you can if needed, which is why it's
  // not declared `private`
  readonly _registry: StealthKeyRegistryContract;

  /**
   * @notice Create StealthKeyRegistry instance to interact with the registry
   * @param signerOrProvider signer or provider to use
   */
  constructor(signerOrProvider: JsonRpcSigner | EthersProvider) {
    this._registry = new Contract(stealthKeyRegistry, abi, signerOrProvider) as unknown as StealthKeyRegistryContract;
  }

  /**
   * @notice For a given account, recovers and returns the public keys
   * @param account Address to get public keys for
   */
  async getStealthKeys(account: string) {
    // Read stealth keys from the resolver contract
    const keys = await this._registry.stealthKeys(account);
    const { spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = keys;

    // Throw if no stealth keys are set
    if (spendingPubKeyPrefix.eq(0) || spendingPubKey.eq(0) || viewingPubKeyPrefix.eq(0) || viewingPubKey.eq(0)) {
      throw new Error(`Address ${account} has not registered stealth keys. Please ask them to setup their Umbra account`); // prettier-ignore
    }

    // Decompress keys and return them
    const spendingPublicKey = KeyPair.getUncompressedFromX(spendingPubKey, spendingPubKeyPrefix.toNumber());
    const viewingPublicKey = KeyPair.getUncompressedFromX(viewingPubKey, viewingPubKeyPrefix.toNumber());
    return { spendingPublicKey, viewingPublicKey };
  }

  /**
   * @notice Set stealth keys
   * @param spendingPublicKey The public key for generating a stealth address as hex string
   * @param viewingPublicKey The public key to use for encryption as hex string
   * @param signer Optional signer which specifies the account to set stealth keys for. If not provided, the signer
   * attached to `this.registry` is used
   * @returns Transaction
   */
  async setStealthKeys(
    spendingPublicKey: string,
    viewingPublicKey: string,
    signer: JsonRpcSigner | null = null
  ): Promise<TransactionResponse> {
    // Get instance of StealthKeyRegistry contract
    const registry = signer ? this._registry.connect(signer) : this._registry;

    // Break public keys into the required components to store compressed public keys
    const { prefix: spendingPrefix, pubKeyXCoordinate: spendingPubKeyX } = KeyPair.compressPublicKey(spendingPublicKey);
    const { prefix: viewingPrefix, pubKeyXCoordinate: viewingPubKeyX } = KeyPair.compressPublicKey(viewingPublicKey);

    // Send transaction to set the keys
    return registry.setStealthKeys(spendingPrefix, spendingPubKeyX, viewingPrefix, viewingPubKeyX);
  }
}
