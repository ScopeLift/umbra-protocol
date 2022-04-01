const { ethers, web3, artifacts } = require('hardhat');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { RelayProvider } = require('@opengsn/gsn/dist/src/relayclient/RelayProvider');
const { GsnTestEnvironment } = require('@opengsn/gsn/dist/GsnTestEnvironment');
const { argumentBytes } = require('../sample-data');
const { sumTokenAmounts, signMetaWithdrawal } = require('../utils');

const Umbra = artifacts.require('Umbra');
const UmbraPaymaster = artifacts.require('UmbraPaymaster');
const UmbraRelayRecipient = artifacts.require('UmbraRelayRecipient');
const UmbraForwarder = artifacts.require('UmbraForwarder');
const TestToken = artifacts.require('TestToken');

const { toWei } = web3.utils;

const origProvider = web3.currentProvider;

const relayerTokenFee = toWei('1', 'ether');
const tokenAccepted = toWei('99', 'ether');
const tokenAmount = sumTokenAmounts([relayerTokenFee, tokenAccepted]);

describe('Umbra GSN', () => {
  let owner, tollCollector, tollReceiver, payer, acceptor, relayer;
  const ctx = {};
  const deployedToll = toWei('0.001', 'ether');

  // The ethers wallet that will be used when testing meta tx withdrawals
  const receiverWallet = ethers.Wallet.createRandom();
  const receiver = receiverWallet.address;

  before(async () => {
    [owner, tollCollector, tollReceiver, payer, acceptor, relayer] = await web3.eth.getAccounts();

    // Get the current chainId
    ctx.chainId = await web3.eth.getChainId();

    // Deploy the Umbra contract
    ctx.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, { from: owner });

    // Mint tokens needed for test
    ctx.token = await TestToken.new('TestToken', 'TT');
    await ctx.token.mint(payer, tokenAmount);

    // Start the GSN Test environment— this includes deployment of a relay hub and
    // a stake manager, as well as starting a relay server. It also deploys a naive Paymaster and
    // a Forwarder implementation, but in both cases, we will use our own
    const gsnInstance = await GsnTestEnvironment.startGsn('localhost');

    // Deploy our custom forwarder, which ignore signature validation, and save its address
    // We'll need it when sending contract calls via our RelayProvider
    const deployedForwarder = await UmbraForwarder.new({ from: owner });
    ctx.forwarder = deployedForwarder.address;

    // Deploy the Umbra GSN wrapper
    ctx.relayRecipient = await UmbraRelayRecipient.new(ctx.umbra.address, ctx.forwarder, {
      from: owner,
    });

    // Deploy the Umbra Paymaster
    ctx.paymaster = await UmbraPaymaster.new(ctx.relayRecipient.address, { from: owner });

    // Configure our paymaster to use the global RelayHub instance
    await ctx.paymaster.setRelayHub(gsnInstance.contractsDeployment.relayHubAddress, {
      from: owner,
    });

    // Configure GSN with the params from the test deployment + our paymaster
    const gsnConfigParams = {
      gasPriceFactorPercent: 70,
      // methodSuffix: '_v4',
      // jsonStringifyRequest: true,
      // chainId: '*',
      relayLookupWindowBlocks: 1e5,
      preferredRelays: [gsnInstance.relayUrl],
      relayHubAddress: gsnInstance.contractsDeployment.relayHubAddress,
      stakeManagerAddress: gsnInstance.contractsDeployment.stakeManagerAddress,
      paymasterAddress: ctx.paymaster.address,
      verbose: false,
    };

    // Create and save a RelayProvider. This web3 provder wraps the original web3
    // provider given by the OZ test environment, but also accounts for interaction with
    // contracts via GSN, and thus needs to know our gsn config as well
    ctx.gsnProvider = await RelayProvider.newProvider({
      provider: origProvider,
      config: gsnConfigParams,
    }).init();

    // Fund our Paymaster to pay for gas. Actually, ctx funds the RelayHub with ETH our Paymaster
    // has the right to spend, since payments to the Paymaster are forwarded
    await web3.eth.sendTransaction({
      from: owner,
      to: ctx.paymaster.address,
      value: toWei('1', 'ether'),
    });
  });

  // Sending the token is done without GSN
  it('should allow someone to pay with a token', async () => {
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, tokenAmount, { from: payer });
    const receipt = await ctx.umbra.sendToken(receiver, ctx.token.address, tokenAmount, ...argumentBytes, {
      from: payer,
      value: toll,
    });

    const contractBalance = await ctx.token.balanceOf(ctx.umbra.address);

    expect(contractBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver,
      amount: tokenAmount,
      token: ctx.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not allow a non-receiver to withdraw tokens with GSN', async () => {
    // This line updates the web3 Provider used by our ctx.relayRecipient instance for all future calls.
    // Needing to do update it this way is an idiosyncracy of truffle-contract. The important
    // thing is that calls be made using the RelayProvider instantiated previously.
    // By using the RelayProvider instances, tx's sent through ctx.relayRecipient will now go through GSN.
    UmbraRelayRecipient.web3.setProvider(ctx.gsnProvider);

    const otherWallet = ethers.Wallet.createRandom();

    const { v, r, s } = await signMetaWithdrawal(
      otherWallet,
      ctx.chainId,
      ctx.umbra.address,
      acceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await expectRevert(
      ctx.relayRecipient.withdrawTokenOnBehalf(
        otherWallet.address,
        acceptor,
        ctx.token.address,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: ctx.forwarder,
        }
      ),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should not allow an invalid signature to withdraw tokens with GSN', async () => {
    // Technically ctx is only needed once in the first test, but we repeat it in each test
    // to avoid failures if test ordering is chagned.
    UmbraRelayRecipient.web3.setProvider(ctx.gsnProvider);

    const otherWallet = ethers.Wallet.createRandom();

    const { v, r, s } = await signMetaWithdrawal(
      otherWallet,
      ctx.chainId,
      ctx.umbra.address,
      acceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await expectRevert(
      ctx.relayRecipient.withdrawTokenOnBehalf(
        receiverWallet.address,
        acceptor,
        ctx.token.address,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: ctx.forwarder,
        }
      ),
      'Umbra: Invalid Signature'
    );
  });

  it('should allow receiver to withdraw their tokens with GSN', async () => {
    UmbraRelayRecipient.web3.setProvider(ctx.gsnProvider);

    const { v, r, s } = await signMetaWithdrawal(
      receiverWallet,
      ctx.chainId,
      ctx.umbra.address,
      acceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await ctx.relayRecipient.withdrawTokenOnBehalf(
      receiverWallet.address,
      acceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee,
      v,
      r,
      s,
      {
        from: relayer,
        // When making a contract call with the RelayProvider, an additional options param is
        // needed: the forwarder that will be used.
        forwarder: ctx.forwarder,
      }
    );

    const acceptorBalance = await ctx.token.balanceOf(acceptor);
    expect(acceptorBalance.toString()).to.equal(tokenAccepted);

    const relayerBalance = await ctx.token.balanceOf(relayer);
    expect(relayerBalance.toString()).to.equal(relayerTokenFee);
  });

  it('should not allow a receiver to withdraw tokens twice with GSN', async () => {
    UmbraRelayRecipient.web3.setProvider(ctx.gsnProvider);

    const { v, r, s } = await signMetaWithdrawal(
      receiverWallet,
      ctx.chainId,
      ctx.umbra.address,
      acceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await expectRevert(
      ctx.relayRecipient.withdrawTokenOnBehalf(
        receiverWallet.address,
        acceptor,
        ctx.token.address,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: ctx.forwarder,
        }
      ),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });
});
