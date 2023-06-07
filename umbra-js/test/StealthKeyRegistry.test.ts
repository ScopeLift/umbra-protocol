import { ethers } from 'hardhat';
import { expect } from 'chai';
import { expectRejection } from './utils';
import { JsonRpcSigner } from '../src/ethers';

import { Umbra } from '../src/classes/Umbra';
import { StealthKeyRegistry } from '../src/classes/StealthKeyRegistry';

const stealthKeyRegistryAddress = '0x31fe56609C65Cd0C510E7125f051D440424D38f3';

describe('StealthKeyRegistry class', () => {
  let stealthKeyRegistry: StealthKeyRegistry;

  beforeEach(() => {
    stealthKeyRegistry = new StealthKeyRegistry(ethers.provider);
  });

  it('constructor: sets the registry contract', async () => {
    expect(stealthKeyRegistry._registry.address).to.equal(stealthKeyRegistryAddress);
  });

  it('getStealthKeys: throws if account has not registered stealth keys', async () => {
    const account = ethers.Wallet.createRandom().address;
    const errorMsg = `Address ${account} has not registered stealth keys. Please ask them to setup their Umbra account`;
    await expectRejection(stealthKeyRegistry.getStealthKeys(account), errorMsg);
  });

  it('setStealthKeys: throws if registry has no signer and a signer is not specified', async () => {
    // this error comes from ethers, but useful to test to ensure a default signer isn't somehow used
    const pubkey = ethers.Wallet.createRandom().publicKey;
    const errorMsg = 'sending a transaction requires a signer (operation="sendTransaction", code=UNSUPPORTED_OPERATION, version=contracts/5.5.0)'; // prettier-ignore
    await expectRejection(stealthKeyRegistry.setStealthKeys(pubkey, pubkey), errorMsg);
  });

  it('sets and gets stealth keys', async () => {
    // Generate keys
    const [user] = await ethers.getSigners(); // type SignerWithAddress
    const userSigner = user as unknown as JsonRpcSigner; // type cast to avoid TS errors
    const umbra = new Umbra(ethers.provider, 11155111);
    const { spendingKeyPair: spendKey, viewingKeyPair: viewKey } = await umbra.generatePrivateKeys(userSigner);

    // Set keys
    await stealthKeyRegistry.setStealthKeys(spendKey.publicKeyHex, viewKey.publicKeyHex, userSigner);

    // Get keys and validate they match
    const { spendingPublicKey, viewingPublicKey } = await stealthKeyRegistry.getStealthKeys(user.address);
    expect(spendingPublicKey).to.equal(spendKey.publicKeyHex);
    expect(viewingPublicKey).to.equal(viewKey.publicKeyHex);
  });
});
