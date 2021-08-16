import hre, { ethers } from 'hardhat';
// const { provider } = ethers;
const { isAddress } = ethers.utils;
import { Artifact } from 'hardhat/types';

import { StealthKeyRegistry } from '../typechain';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
// import { parseEther } from '@ethersproject/units';
// import { Contract } from '@ethersproject/contracts';

const { deployContract } = hre.waffle;

describe('StealthKeyRegistry', () => {
  let user: SignerWithAddress;
  let registry: StealthKeyRegistry;

  before(async () => {
    [user] = await hre.ethers.getSigners();
  });

  beforeEach(async () => {
    const stealthKeyRegistryArtifact: Artifact = await hre.artifacts.readArtifact('StealthKeyRegistry');
    registry = (await deployContract(user, stealthKeyRegistryArtifact)) as StealthKeyRegistry;
  });

  it('should deploy the registry contract', () => {
    expect(isAddress(registry.address), 'Failed to deploy StealthKeyRegistry').to.be.true;
  });
});
