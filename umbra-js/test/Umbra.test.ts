import { Umbra } from '../src/classes/Umbra';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { Web3Provider, JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers';
import * as chai from 'chai';
import { accounts, provider } from '@openzeppelin/test-environment';
import type { ChainConfig, ExternalProvider } from '../src/types';
import {
  TestToken as ERC20,
  Umbra as UmbraContract,
  TestTokenFactory as ERC20__factory,
  UmbraFactory as Umbra__factory,
} from '@umbra/contracts/typechain';
import { node } from '../test-environment.config';

const { expect } = chai;
const { parseEther } = ethers.utils;

const web3Provider = (provider as unknown) as ExternalProvider;
const ethersProvider = new Web3Provider(web3Provider);
const JSON_RPC_URL = node.fork;
const jsonRpcProvider = new JsonRpcProvider(JSON_RPC_URL);

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const payloadExtension = '0x0123456789abcdef0123456789abcdef';
const quantity = parseEther('5');

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
  let chainConfig: ChainConfig;

  const getEthBalance = async (address: string) => {
    return (await ethersProvider.getBalance(address)).toString();
  };
  const verifyEqualValues = (val1: BigNumberish, val2: BigNumberish) => {
    expect(BigNumber.from(val1).toString()).to.equal(BigNumber.from(val2).toString());
  };

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
    sender.signer = ethersProvider.getSigner(signerIndex);
    receiver.signer = ethersProvider.getSigner(receiverIndex);

    // Deploy Umbra
    const toll = parseEther('0.1');
    const tollCollector = ethers.constants.AddressZero; // doesn't matter for these tests
    const tollReceiver = ethers.constants.AddressZero; // doesn't matter for these tests
    const umbraFactory = new Umbra__factory(sender.signer);
    const umbraContract = (await umbraFactory.deploy(toll, tollCollector, tollReceiver)) as UmbraContract;
    await umbraContract.deployTransaction.wait();

    // Deploy mock tokens
    const daiFactory = new ERC20__factory(sender.signer);
    dai = (await daiFactory.deploy('Dai', 'DAI')) as ERC20;
    await dai.deployTransaction.wait();

    // Get chainConfig based on most recent Rinkeby block number to minimize scanning time
    const lastBlockNumber = await ethersProvider.getBlockNumber();
    chainConfig = {
      chainId: 4, // Rinkeby chainID
      umbraAddress: umbraContract.address,
      startBlock: lastBlockNumber,
    };

    // Get Umbra instance
    umbra = new Umbra(ethersProvider, chainConfig);
  });

  describe('Initialization', () => {
    it('initializes correctly when passing a chain config', async () => {
      // URL provider
      const umbra1 = new Umbra(jsonRpcProvider, chainConfig);
      expect(umbra1.provider._isProvider).to.be.true;
      expect(umbra1.chainConfig.umbraAddress).to.equal(chainConfig.umbraAddress);
      expect(umbra1.chainConfig.startBlock).to.equal(chainConfig.startBlock);

      // Web3 provider
      const umbra2 = new Umbra(ethersProvider, chainConfig);
      expect(umbra2.provider._isProvider).to.be.true;
      expect(umbra2.chainConfig.umbraAddress).to.equal(chainConfig.umbraAddress);
      expect(umbra2.chainConfig.startBlock).to.equal(chainConfig.startBlock);
    });

    it('initializes correctly when passing a default chainId', async () => {
      // Localhost with URL provider
      const umbra1 = new Umbra(jsonRpcProvider, 1337);
      expect(umbra1.chainConfig.umbraAddress).to.equal('0xf5e6B5D161d603e67196B8269c6de3Fb7492A8fF');
      expect(umbra1.chainConfig.startBlock).to.equal(8218912);

      // Localhost with Web3 provider
      const umbra2 = new Umbra(ethersProvider, 1337);
      expect(umbra2.chainConfig.umbraAddress).to.equal('0xf5e6B5D161d603e67196B8269c6de3Fb7492A8fF');
      expect(umbra2.chainConfig.startBlock).to.equal(8218912);

      // Ropsten with URL provider
      const umbra3 = new Umbra(jsonRpcProvider, 4);
      expect(umbra3.chainConfig.umbraAddress).to.equal('0xf5e6B5D161d603e67196B8269c6de3Fb7492A8fF');
      expect(umbra3.chainConfig.startBlock).to.equal(8218912);

      // Ropsten with Web3 provider
      const umbra4 = new Umbra(jsonRpcProvider, 4);
      expect(umbra4.chainConfig.umbraAddress).to.equal('0xf5e6B5D161d603e67196B8269c6de3Fb7492A8fF');
      expect(umbra4.chainConfig.startBlock).to.equal(8218912);
    });

    it('does not allow invalid default chain IDs to be provided', async () => {
      const msg = 'Unsupported chain ID provided';
      const constructor1 = () => new Umbra(jsonRpcProvider, 999);
      const constructor2 = () => new Umbra(ethersProvider, 999);
      expect(constructor1).to.throw(msg);
      expect(constructor2).to.throw(msg);
    });
  });

  describe('Private key generation', () => {
    it('properly generates private keys', async () => {
      const wallet = ethers.Wallet.createRandom();
      const { spendingKeyPair, viewingKeyPair } = await umbra.generatePrivateKeys(wallet);
      expect(spendingKeyPair.privateKeyHex).to.have.length(66);
      expect(viewingKeyPair.privateKeyHex).to.have.length(66);
    });
  });

  describe('Send, scan, and withdraw funds', () => {
    const mintAndApproveDai = async (signer: JsonRpcSigner, user: string, amount: BigNumber) => {
      await dai.connect(signer).mint(user, amount);
      await dai.connect(signer).approve(umbra.umbraContract.address, ethers.constants.MaxUint256);
    };

    it('reverts if sender does not have enough tokens', async () => {
      const msg = `Insufficient balance to complete transfer. Has 0 tokens, tried to send ${quantity.toString()} tokens.`;
      await expectRejection(umbra.send(sender.signer, dai.address, quantity, receiver.wallet!.address), msg);
    });

    it('reverts if sender does not have enough ETH', async () => {
      // ETH balance is checked by ethers when sending a transaction and therefore does not need to
      // be tested here. If the user has insufficient balance it will throw with
      // `insufficient funds for gas * price + value`
    });

    it('Without payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the Umbra contract to spend their DAI
      await mintAndApproveDai(sender.signer, sender.wallet.address, quantity);

      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(sender.signer, dai.address, quantity, receiver.wallet!.publicKey);
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const { userAnnouncements } = await umbra.scan(receiver.wallet.publicKey, receiver.wallet.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal, so we need to transfer ETH to pay gas)
      // Destination wallet should have a balance equal to amount sent

      // First we send ETH to the stealth address
      await sender.signer.sendTransaction({ to: stealthKeyPair.address, value: parseEther('1') });

      // Now we withdraw the tokens
      const stealthPrivateKey = Umbra.computeStealthPrivateKey(
        receiver.wallet.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), 0);
      const withdrawTxToken = await umbra.withdraw(stealthPrivateKey, dai.address, destinationWallet.address);
      await withdrawTxToken.wait();
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), quantity);
      verifyEqualValues(await dai.balanceOf(stealthKeyPair.address), 0);

      // And for good measure let's withdraw the rest of the ETH
      const initialEthBalance = await getEthBalance(stealthKeyPair.address);
      const withdrawTxEth = await umbra.withdraw(stealthPrivateKey, ETH_ADDRESS, destinationWallet.address);
      await withdrawTxEth.wait();
      const withdrawEthReceipt = await ethersProvider.getTransactionReceipt(withdrawTxEth.hash);
      const withdrawTokenTxCost = withdrawEthReceipt.gasUsed.mul(withdrawTxEth.gasPrice);
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
      verifyEqualValues(
        await getEthBalance(destinationWallet.address),
        BigNumber.from(initialEthBalance).sub(withdrawTokenTxCost)
      );
    });

    it('With payload extension: send tokens, scan for them, withdraw them', async () => {
      // SENDER
      // Mint Dai to sender, and approve the Umbra contract to spend their DAI
      await mintAndApproveDai(sender.signer, sender.wallet.address, quantity);

      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        sender.signer,
        dai.address,
        quantity,
        receiver.wallet!.publicKey,
        { payloadExtension }
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const { userAnnouncements } = await umbra.scan(receiver.wallet.publicKey, receiver.wallet.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test withdraw by signature)
      const destinationWallet = ethers.Wallet.createRandom();
      const relayerWallet = ethers.Wallet.createRandom();
      const sponsorWallet = ethers.Wallet.createRandom();
      const sponsorFee = '2500';

      // Fund relayer
      await sender.signer.sendTransaction({ to: relayerWallet.address, value: parseEther('1') });

      // Get signature
      const stealthPrivateKey = Umbra.computeStealthPrivateKey(
        receiver.wallet.privateKey,
        userAnnouncements[0].randomNumber
      );

      // TODO why are these 3 different? Perhaps bug in OpenZeppelin Test Environment forking -- try Hardhat?
      console.log(
        'TODO Why are these 3 different? Bug in OpenZeppelin Test Environment forking? Should switch to Hardhat anyway for consistency with /contracts'
      );
      console.log('umbra.chainConfig.chainId:     ', umbra.chainConfig.chainId); // returns 4
      console.log('umbra.umbraContract.chainId(): ', (await umbra.umbraContract.chainId()).toNumber()); // returns 1
      console.log('ethersProvider.getNetwork():   ', (await ethersProvider.getNetwork()).chainId); // returns 1337

      const { v, r, s } = await Umbra.signWithdraw(
        stealthPrivateKey,
        (await umbra.umbraContract.chainId()).toNumber(),
        await umbra.umbraContract.version(),
        destinationWallet.address,
        dai.address,
        sponsorWallet.address,
        sponsorFee
      );

      // Relay transaction
      await umbra.withdrawOnBehalf(
        relayerWallet,
        stealthKeyPair.address,
        destinationWallet.address,
        dai.address,
        sponsorWallet.address,
        sponsorFee,
        v,
        r,
        s
      );
      const expectedAmountReceived = BigNumber.from(quantity).sub(sponsorFee);
      verifyEqualValues(await dai.balanceOf(destinationWallet.address), expectedAmountReceived);
      verifyEqualValues(await dai.balanceOf(stealthKeyPair.address), 0);
      verifyEqualValues(await dai.balanceOf(sponsorWallet.address), sponsorFee);
    });

    it('Without payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(sender.signer, ETH_ADDRESS, quantity, receiver.wallet!.publicKey);
      await tx.wait();
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), quantity);

      // RECEIVER
      // Receiver scans for funds send to them
      const { userAnnouncements } = await umbra.scan(receiver.wallet.publicKey, receiver.wallet.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal)
      // Destination wallet should have a balance equal to amount sent minus gas cost
      const stealthPrivateKey = Umbra.computeStealthPrivateKey(
        receiver.wallet.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      const withdrawTx = await umbra.withdraw(stealthPrivateKey, 'ETH', destinationWallet.address);
      await withdrawTx.wait();
      const txCost = withdrawTx.gasLimit.mul(withdrawTx.gasPrice);
      verifyEqualValues(await getEthBalance(destinationWallet.address), quantity.sub(txCost));
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
    });

    it('With payload extension: send ETH, scan for it, withdraw it', async () => {
      // SENDER
      // Send funds with Umbra
      const { tx, stealthKeyPair } = await umbra.send(
        sender.signer,
        ETH_ADDRESS,
        quantity,
        receiver.wallet!.publicKey,
        { payloadExtension }
      );
      await tx.wait();

      // RECEIVER
      // Receiver scans for funds send to them
      const { userAnnouncements } = await umbra.scan(receiver.wallet.publicKey, receiver.wallet.privateKey);
      expect(userAnnouncements.length).to.be.greaterThan(0);

      // Withdraw (test regular withdrawal)
      // Destination wallet should have a balance equal to amount sent minus gas cost
      const stealthPrivateKey = Umbra.computeStealthPrivateKey(
        receiver.wallet.privateKey,
        userAnnouncements[0].randomNumber
      );
      const destinationWallet = ethers.Wallet.createRandom();
      const withdrawTx = await umbra.withdraw(stealthPrivateKey, 'ETH', destinationWallet.address);
      await withdrawTx.wait();
      const txCost = withdrawTx.gasLimit.mul(withdrawTx.gasPrice);
      verifyEqualValues(await getEthBalance(destinationWallet.address), quantity.sub(txCost));
      verifyEqualValues(await getEthBalance(stealthKeyPair.address), 0);
    });
  });

  describe('Input validation', () => {
    // ts-expect-error statements needed throughout this section to bypass TypeScript checks that would stop this file
    // from being compiled/ran

    it('throws when initializing with an invalid chainConfig', () => {
      const errorMsg1 = "Invalid start block provided in chainConfig. Got 'undefined'";
      const errorMsg2 = "Invalid start block provided in chainConfig. Got '1'";
      const umbraAddress = '0xf5e6B5D161d603e67196B8269c6de3Fb7492A8fF'; // address does not matter here

      // @ts-expect-error
      expect(() => new Umbra(ethersProvider)).to.throw('chainConfig not provided');
      // @ts-expect-error
      expect(() => new Umbra(ethersProvider, {})).to.throw(errorMsg1);
      // @ts-expect-error
      expect(() => new Umbra(ethersProvider, { umbraAddress })).to.throw(errorMsg1);
      // @ts-expect-error
      expect(() => new Umbra(ethersProvider, { startBlock: 0, chainId: 4 })).to.throw(
        'invalid address (argument="address", value=undefined, code=INVALID_ARGUMENT, version=address/5.0.10)'
      );
      // @ts-expect-error
      expect(() => new Umbra(ethersProvider, { umbraAddress: '123', startBlock: '1' })).to.throw(errorMsg2);
    });

    it('throws when isEth is passed a bad address', async () => {
      // These error messages come from ethers
      await expectRejection(
        umbra.send(sender.signer, '123', '1', '1'), // last two args are dummy args since we're testing the second input
        'invalid address (argument="address", value="123", code=INVALID_ARGUMENT, version=address/5.0.10)'
      );
      await expectRejection(
        // @ts-expect-error
        umbra.send(sender.signer, 123, '1', '1'), // last two args are dummy args since we're testing the second input
        'invalid address (argument="address", value=123, code=INVALID_ARGUMENT, version=address/5.0.10)'
      );
    });

    it('throws when signWithdraw is passed a bad address', async () => {
      // Actual values of input parameters don't matter for this test
      const privateKey = receiver.wallet.privateKey;
      const goodAddress = receiver.wallet.address;
      const badAddress = '0x123';
      const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // address does not matter here
      // These error messages come from ethers
      await expectRejection(
        Umbra.signWithdraw(privateKey, 4, '1', badAddress, tokenAddress, goodAddress, '1'),
        'invalid address (argument="address", value="0x123", code=INVALID_ARGUMENT, version=address/5.0.10)'
      );
      await expectRejection(
        Umbra.signWithdraw(privateKey, 4, '1', goodAddress, tokenAddress, badAddress, '1'),
        'invalid address (argument="address", value="0x123", code=INVALID_ARGUMENT, version=address/5.0.10)'
      );
    });
  });
});
