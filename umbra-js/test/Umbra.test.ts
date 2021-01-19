import { KeyPair } from '../src/classes/KeyPair';
import { Umbra } from '../src/classes/Umbra';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import * as chai from 'chai';
import { accounts, provider } from '@openzeppelin/test-environment';
import type { ChainConfig, ExternalProvider } from '../src/types';
import { TestToken as ERC20, TestToken__factory as ERC20__factory } from '../types/contracts';
import { node } from '../test-environment.config';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);

const JSON_RPC_URL = node.fork;
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const payloadExtension = '0x0123456789abcdef0123456789abcdef';
const quantity = ethers.utils.parseEther('10');

/**
 * @notice Wrapper function to verify that an async function rejects with the specified message
 * @param promise Promise to wait for
 * @param message Expected rejection message
 */
const expectRejection = async (promise: Promise<any>, message: string) => {
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

const signerIndex = 2;
const receiverIndex = 3;

type TestSigner = {
  wallet: ethers.Wallet;
  signer: ethers.providers.JsonRpcSigner;
};

describe('Umbra class', () => {
  let sender = {} as TestSigner;
  let receiver = {} as TestSigner;

  let dai: ERC20;
  let umbra: Umbra;
  let umbraReadonly: Umbra;

  before(() => {
    // Load private keys of ganache accounts
    const keys = require('../test-keys.json');

    // Create wallets for all ganache accounts
    const wallets = accounts.map((account) => {
      const key = keys.private_keys[account.toLowerCase()];
      const wallet = new ethers.Wallet(`0x${key}`).connect(ethersProvider);
      expect(wallet.address).to.equal(account);
      return wallet;
    });

    // Assign to our variables. Offset by 1 since openzeppelin skips first account by default, but
    // looping through the accounts above doesn't
    sender['wallet'] = wallets[signerIndex - 1];
    receiver['wallet'] = wallets[receiverIndex - 1];
  });

  beforeEach(async () => {
    // Get signers (can't use wallets since they need providers)
    const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
    sender.signer = ethersProvider.getSigner(signerIndex);
    // const receiver.signer = ethersProvider.getSigner(receiverIndex);

    // Get chainConfig based on most recent Ropsten block number to minimize scanning time
    const lastBlockNumber = await ethersProvider.getBlockNumber();
    const chainConfig: ChainConfig = {
      umbraAddress: '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0',
      startBlock: lastBlockNumber,
    };

    // Get Umbra instances
    umbra = await Umbra.create(sender.signer, chainConfig);
    umbraReadonly = await Umbra.createReadonly(JSON_RPC_URL, chainConfig);

    // Deploy mock tokens
    const daiFactory = new ERC20__factory(sender.signer);
    dai = (await daiFactory.deploy('Dai', 'DAI')) as ERC20;
    await dai.deployTransaction.wait();
  });

  describe('Initialization', () => {
    it('initializes correctly when using a web3 provider', async () => {
      expect(umbra.provider._isProvider).to.be.true;
      expect(Boolean(umbra.signer)).to.be.true;
    });

    it('initializes correctly when using a JSON-RPC provider', async () => {
      expect(umbraReadonly.provider._isProvider).to.be.true;
      expect(Boolean(umbraReadonly.signer)).to.be.false;
    });

    it('initializes correctly when using a default chainId', async () => {
      // Localhost with signer
      const umbra1 = await Umbra.create(sender.signer, 1337);
      expect(umbra1.chainConfig.umbraAddress).to.equal(
        '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0'
      );
      expect(umbra1.chainConfig.startBlock).to.equal(9496718);

      // Localhost with read-only provider
      const umbra2 = await Umbra.createReadonly(JSON_RPC_URL, 1337);
      expect(umbra2.chainConfig.umbraAddress).to.equal(
        '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0'
      );
      expect(umbra2.chainConfig.startBlock).to.equal(9496718);

      // Ropsten with signer
      const umbra3 = await Umbra.create(sender.signer, 3);
      expect(umbra3.chainConfig.umbraAddress).to.equal(
        '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0'
      );
      expect(umbra3.chainConfig.startBlock).to.equal(9496718);

      // Ropsten with read-only provider
      const umbra4 = await Umbra.createReadonly(JSON_RPC_URL, 3);
      expect(umbra4.chainConfig.umbraAddress).to.equal(
        '0x3bB03be8dAB8969b16684D360eD2C7Aa47dC36f0'
      );
      expect(umbra4.chainConfig.startBlock).to.equal(9496718);
    });

    it('does not allow invalid default chain IDs to be provided', async () => {
      const msg = 'Unsupported chain ID provided';
      await expectRejection(Umbra.create(sender.signer, 999), msg);
      await expectRejection(Umbra.createReadonly(JSON_RPC_URL, 999), msg);
    });

    it('initializes correctly when using a custom chain configuration', async () => {
      // Define random properties since they are not verified
      const chainConfig = { umbraAddress: ethers.constants.AddressZero, startBlock: 100 };

      // Custom chain config with signer
      const umbra1 = await Umbra.create(sender.signer, chainConfig);
      expect(umbra1.chainConfig.umbraAddress).to.equal(chainConfig.umbraAddress);
      expect(umbra1.chainConfig.startBlock).to.equal(chainConfig.startBlock);

      // Custom chain config with read-only provider
      const umbra2 = await Umbra.createReadonly(JSON_RPC_URL, chainConfig);
      expect(umbra2.chainConfig.umbraAddress).to.equal(chainConfig.umbraAddress);
      expect(umbra2.chainConfig.startBlock).to.equal(chainConfig.startBlock);
    });
  });

  describe('Sends funds', () => {
    it('reverts if sender does not have enough tokens', async () => {
      const msg = `Insufficient balance to complete transfer. Has 0 tokens, tried to send ${quantity.toString()} tokens.`;
      await expectRejection(umbra.send(dai.address, quantity, receiver.wallet!.address), msg);
    });

    it('reverts if sender does not have enough ETH', async () => {
      // ETH balance is checked by ethers when sending a transaction and therefore does not need to
      // be tested here. If the user has insufficient balance it will throw with
      // `insufficient funds for gas * price + value`
    });

    it('Without payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the Umbra contract to spend their DAI
      await dai.connect(sender.signer).mint(sender.wallet.address, quantity);
      await dai
        .connect(sender.signer)
        .approve(umbra.umbraContract.address, ethers.constants.MaxUint256);

      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        dai.address,
        quantity,
        receiver.wallet!.publicKey
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const receiverKeyPair = new KeyPair(receiver.wallet.privateKey);
      const { userAnnouncements } = await umbra.scan(receiverKeyPair);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw
      // TODO once meta-transaction implementation is done + contract redeployed
      stealthKeyPair; // silence unused error -- we'll use this to verify receipt/withdrawals later
    });

    it('With payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the Umbra contract to spend their DAI
      await dai.connect(sender.signer).mint(sender.wallet.address, quantity);
      await dai
        .connect(sender.signer)
        .approve(umbra.umbraContract.address, ethers.constants.MaxUint256);

      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        dai.address,
        quantity,
        receiver.wallet!.publicKey,
        { payloadExtension }
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const receiverKeyPair = new KeyPair(receiver.wallet.privateKey);
      const { userAnnouncements } = await umbra.scan(receiverKeyPair);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw
      // TODO once meta-transaction implementation is done + contract redeployed
      stealthKeyPair; // silence unused error -- we'll use this to verify receipt/withdrawals later
    });

    it('Without payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        ETH_ADDRESS,
        quantity,
        receiver.wallet!.publicKey
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const receiverKeyPair = new KeyPair(receiver.wallet.privateKey);
      const { userAnnouncements } = await umbra.scan(receiverKeyPair);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw
      // TODO once meta-transaction implementation is done + contract redeployed
      stealthKeyPair; // silence unused error -- we'll use this to verify receipt/withdrawals later
    });

    it('With payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        ETH_ADDRESS,
        quantity,
        receiver.wallet!.publicKey,
        { payloadExtension }
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const receiverKeyPair = new KeyPair(receiver.wallet.privateKey);
      const { userAnnouncements } = await umbra.scan(receiverKeyPair);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw
      // TODO once meta-transaction implementation is done + contract redeployed
      stealthKeyPair; // silence unused error -- we'll use this to verify receipt/withdrawals later
    });
  });
});
