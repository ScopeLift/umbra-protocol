import hre, { ethers } from 'hardhat';
const { isAddress } = ethers.utils;
import { Artifact } from 'hardhat/types';

import { StealthKeyRegistry } from '../typechain';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

const { deployContract } = hre.waffle;

const SPENDING_KEY = 10;
const VIEWING_KEY = 20;

describe('StealthKeyRegistry', () => {
  let user: SignerWithAddress;
  let anotherUser: SignerWithAddress;
  let relayer: SignerWithAddress;
  let registry: StealthKeyRegistry;

  before(async () => {
    [user, anotherUser, relayer] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    const stealthKeyRegistryArtifact: Artifact = await hre.artifacts.readArtifact('StealthKeyRegistry');
    registry = (await deployContract(user, stealthKeyRegistryArtifact)) as StealthKeyRegistry;
  });

  describe('initialization', () => {
    it('should deploy the registry contract', () => {
      expect(isAddress(registry.address), 'Failed to deploy StealthKeyRegistry').to.be.true;
    });

    it('should initialize with empty stealth keys', async () => {
      const { spendingPubKey, viewingPubKey } = await registry.stealthKeys(user.address);
      expect(spendingPubKey.toNumber()).to.equal(0);
      expect(viewingPubKey.toNumber()).to.equal(0);
    });
  });

  describe('set stealth keys directly', () => {
    it('should let the user set their stealth keys', async () => {
      await registry.setStealthKeys(2, SPENDING_KEY, 2, VIEWING_KEY);
      const { spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      );

      expect(spendingPubKeyPrefix.toNumber()).to.equal(2);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(2);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY);
    });

    it('should let the user overwrite existing stealth keys', async () => {
      // First setup
      await registry.setStealthKeys(3, SPENDING_KEY, 2, VIEWING_KEY);
      let { spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      );

      expect(spendingPubKeyPrefix.toNumber()).to.equal(3);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(2);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY);

      // Overwrite existing
      await registry.setStealthKeys(2, SPENDING_KEY + 1, 3, VIEWING_KEY + 1);
      ({ spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      ));

      expect(spendingPubKeyPrefix.toNumber()).to.equal(2);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY + 1);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(3);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY + 1);
    });

    it('should allow different users to set stealth keys independently', async () => {
      // first user sets keys
      await registry.connect(user).setStealthKeys(3, SPENDING_KEY, 2, VIEWING_KEY);
      let { spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      );

      expect(spendingPubKeyPrefix.toNumber()).to.equal(3);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(2);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY);

      // second user keys are still empty
      ({ spendingPubKey, viewingPubKey } = await registry.stealthKeys(anotherUser.address));

      expect(spendingPubKey.toNumber()).to.equal(0);
      expect(viewingPubKey.toNumber()).to.equal(0);

      // second user sets keys
      await registry.connect(anotherUser).setStealthKeys(2, SPENDING_KEY + 1, 3, VIEWING_KEY + 1);
      ({ spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        anotherUser.address
      ));

      expect(spendingPubKeyPrefix.toNumber()).to.equal(2);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY + 1);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(3);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY + 1);

      // first user keys are unchanged
      ({ spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      ));

      expect(spendingPubKeyPrefix.toNumber()).to.equal(3);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(2);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY);
    });

    it('should emit an event when keys are updated', async () => {
      await expect(registry.setStealthKeys(2, SPENDING_KEY, 3, VIEWING_KEY))
        .to.emit(registry, 'StealthKeyChanged')
        .withArgs(user.address, 2, SPENDING_KEY, 3, VIEWING_KEY);
    });

    it('should not allow a user to set stealth keys with invalid prefixes', async () => {
      await expect(registry.setStealthKeys(1, SPENDING_KEY, 3, VIEWING_KEY)).to.be.revertedWith(
        'StealthKeyRegistry: Invalid Prefix'
      );
      await expect(registry.setStealthKeys(2, SPENDING_KEY, 0, VIEWING_KEY)).to.be.revertedWith(
        'StealthKeyRegistry: Invalid Prefix'
      );
      await expect(registry.setStealthKeys(2, SPENDING_KEY, 4, VIEWING_KEY)).to.be.revertedWith(
        'StealthKeyRegistry: Invalid Prefix'
      );
    });
  });

  describe('set stealth keys via meta tx', () => {
    const signRegistration = async (
      spendingPubKeyPrefix: number,
      spendingPubKey: number,
      viewingPubKeyPrefix: number,
      viewingPubKey: number
    ) => {
      const { chainId } = await ethers.provider.getNetwork();

      const domain = {
        name: 'Umbra Stealth Key Registry',
        version: '1',
        chainId,
        verifyingContract: registry.address,
      };

      const types = {
        StealthKeys: [
          { name: 'spendingPubKeyPrefix', type: 'uint256' },
          { name: 'spendingPubKey', type: 'uint256' },
          { name: 'viewingPubKeyPrefix', type: 'uint256' },
          { name: 'viewingPubKey', type: 'uint256' },
        ],
      };

      const value = {
        spendingPubKeyPrefix,
        spendingPubKey,
        viewingPubKeyPrefix,
        viewingPubKey,
      };

      const signature = await user._signTypedData(domain, types, value);
      return ethers.utils.splitSignature(signature);
    };

    it('should allow the user to update their stealth keys via EIP-712 signature', async () => {
      const { v, r, s } = await signRegistration(3, SPENDING_KEY, 2, VIEWING_KEY);
      await registry.connect(relayer).setStealthKeysOnBehalf(user.address, 3, SPENDING_KEY, 2, VIEWING_KEY, v, r, s);

      const { spendingPubKeyPrefix, spendingPubKey, viewingPubKeyPrefix, viewingPubKey } = await registry.stealthKeys(
        user.address
      );

      expect(spendingPubKeyPrefix.toNumber()).to.equal(3);
      expect(spendingPubKey.toNumber()).to.equal(SPENDING_KEY);
      expect(viewingPubKeyPrefix.toNumber()).to.equal(2);
      expect(viewingPubKey.toNumber()).to.equal(VIEWING_KEY);
    });

    it('should not allow the wrong user to update stealth keys of another registrant', async () => {
      const { v, r, s } = await signRegistration(3, SPENDING_KEY, 2, VIEWING_KEY);
      await expect(
        registry.connect(relayer).setStealthKeysOnBehalf(anotherUser.address, 3, SPENDING_KEY, 2, VIEWING_KEY, v, r, s)
      ).to.be.revertedWith('StealthKeyRegistry: Invalid Signature');
    });

    it('should not allow the user to update their stealth keys after signing over the wrong data', async () => {
      const { v, r, s } = await signRegistration(3, SPENDING_KEY + 1, 2, VIEWING_KEY);
      await expect(
        registry.connect(relayer).setStealthKeysOnBehalf(user.address, 3, SPENDING_KEY, 2, VIEWING_KEY, v, r, s)
      ).to.be.revertedWith('StealthKeyRegistry: Invalid Signature');
    });
  });
});
