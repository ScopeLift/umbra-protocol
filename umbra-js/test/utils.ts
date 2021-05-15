import '@nomiclabs/hardhat-ethers';
import * as chai from 'chai';
import { ethers, network } from 'hardhat';
import { hexZeroPad } from '../src/ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { Contract } from '@ethersproject/contracts';
const { expect } = chai;

/**
 * @notice Wrapper function to verify that an async function rejects with the specified message
 * @param promise Promise to wait for
 * @param message Expected rejection message
 */
export const expectRejection = async (promise: Promise<any>, message: string) => {
  // Error type requires strings, so we set them to an arbitrary value and
  // later check the values. If unchanged, the promise did not reject
  let error: Error = { name: 'default', message: 'default' };
  try {
    await promise;
  } catch (e) {
    error = e;
  } finally {
    expect(error.name).to.not.equal('default');
    expect(error.message).to.not.equal('default');
    expect(error.message).to.equal(message);
  }
};

/**
 * @notice Registers an ENS name
 * @param ensLabel If registering `my-name.eth`, this value should be `my-name`
 * @param user Signer to send registration transaction from
 */
export const registerEnsName = async (ensLabel: string, user: SignerWithAddress) => {
  // Register a domain on forked Rinkeby
  const ethRegistrarControllerAddress = '0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5';
  const ethRegistrarControllerAbi = [
    'function makeCommitmentWithConfig(string memory name, address owner, bytes32 secret, address resolver, address addr) pure public returns(bytes32)',
    'function commit(bytes32 commitment) public',
    'function registerWithConfig(string memory name, address owner, uint duration, bytes32 secret, address resolver, address addr) public payable',
  ];
  const ethRegistrarController = new Contract(ethRegistrarControllerAddress, ethRegistrarControllerAbi, user);

  // Registration Step 1: Commit to a name
  const pskResolverAddress = '0x7D6888e1a454a1fb375125a1688240e5D761fFa6'; // PublicStealthKeyResolver address
  const secret = hexZeroPad('0x1234', 32);
  const commitmentInputs = [ensLabel, user.address, secret, pskResolverAddress, user.address];
  const commitment = await ethRegistrarController.makeCommitmentWithConfig(...commitmentInputs);
  await ethRegistrarController.commit(commitment);

  // Registration Step 2: Register and set resolver to PublicStealthKeyResolver
  const duration = Math.floor(365.2425 * 24 * 60 * 60); // register for one year using (ENS app uses 365.2425 days in a year)
  await network.provider.request({ method: 'evm_increaseTime', params: [61] }); // must wait one minute after commitment
  const registrationInputs = [ensLabel, user.address, duration, secret, pskResolverAddress, user.address];
  await ethRegistrarController.registerWithConfig(...registrationInputs, { value: ethers.utils.parseUnits('1') });
};

/**
 * @notice Registers a CNS name
 * @param cnsLabel If registering `udtestdev-my-name.crypto`, this value should be `my-name`
 * @param user Signer to send registration transaction from
 */
export const registerCnsName = async (cnsLabel: string, user: SignerWithAddress) => {
  // Register a domain on forked Rinkeby using FreeMinter, which is a contract that can be used for allowing any user
  // to freely mint a test domain with udtestdev- prefix.
  const freeMinterAddress = '0x84214215904cDEbA9044ECf95F3eBF009185AAf4';
  const freeMinterAbi = ['function claim(string calldata label) external'];
  const freeMinter = new Contract(freeMinterAddress, freeMinterAbi, user);
  await freeMinter.claim(cnsLabel);
};
