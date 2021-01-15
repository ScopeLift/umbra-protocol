const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const ethers = require('ethers');
const { RelayProvider } = require('@opengsn/gsn/dist/src/relayclient/RelayProvider');
const { GsnTestEnvironment } = require('@opengsn/gsn/dist/GsnTestEnvironment');
const { configureGSN } = require('@opengsn/gsn/dist/src/relayclient/GSNConfigurator');
const { argumentBytes } = require('./sample-data');
const { sumTokenAmounts, signMetaWithdrawal } = require('./utils');

const Umbra = contract.fromArtifact('Umbra');
const UmbraPaymaster = contract.fromArtifact('UmbraPaymaster');
const UmbraRelayRecipient = contract.fromArtifact('UmbraRelayRecipient');
const TestToken = contract.fromArtifact('TestToken');

const { toWei } = web3.utils;

const origProvider = web3.currentProvider;

const relayerTokenFee = toWei('1', 'ether');
const tokenAccepted = toWei('99', 'ether');
const tokenAmount = sumTokenAmounts([relayerTokenFee, tokenAccepted]);

describe('Umbra GSN', () => {
  const [owner, tollCollector, tollReceiver, payer, acceptor, relayer] = accounts;

  const deployedToll = toWei('0.001', 'ether');

  // The ethers wallet that will be used when testing meta tx withdrawals
  const receiverWallet = ethers.Wallet.createRandom();
  const receiver = receiverWallet.address;

  before(async () => {
    // Deploy the Umbra contract
    this.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, { from: owner });

    // Mint tokens needed for test
    this.token = await TestToken.new('TestToken', 'TT');
    await this.token.mint(payer, tokenAmount);

    // Start the GSN Test environment— this includes deployment of a relay hub, a forwarder, and
    // a stake manager, as well as starting a relay server. It also deploys a naive Paymaster, but we
    // will use our own
    const gsnInstance = await GsnTestEnvironment.startGsn(
      UmbraRelayRecipient.web3.currentProvider.wrappedProvider.host
    );

    // Save the forwader, as we'll need it when sending contract calls via our RelayProvider
    this.forwarder = gsnInstance.deploymentResult.forwarderAddress;

    // Deploy the Umbra GSN wrapper & paymaster
    this.relayRecipient = await UmbraRelayRecipient.new(this.umbra.address, this.forwarder, {
      from: owner,
    });
    this.paymaster = await UmbraPaymaster.new(this.relayRecipient.address, { from: owner });

    // Configure GSN with the params from the test deployment + our paymaster
    const gsnConfigParams = {
      gasPriceFactorPercent: 70,
      // methodSuffix: '_v4',
      // jsonStringifyRequest: true,
      // chainId: '*',
      relayLookupWindowBlocks: 1e5,
      preferredRelays: [gsnInstance.relayUrl],
      relayHubAddress: gsnInstance.deploymentResult.relayHubAddress,
      stakeManagerAddress: gsnInstance.deploymentResult.stakeManagerAddress,
      paymasterAddress: this.paymaster.address,
      verbose: false,
    };
    const gsnConfig = configureGSN(gsnConfigParams);

    // Create and save a RelayProvider. This web3 provder wraps the original web3
    // provider given by the OZ test environment, but also accounts for interaction with
    // contracts via GSN, and thus needs to know our gsn config as well
    this.gsnProvider = new RelayProvider(origProvider, gsnConfig);

    // Configure our paymaster to use the global RelayHub instance
    await this.paymaster.setRelayHub(gsnInstance.deploymentResult.relayHubAddress, { from: owner });

    // Fund our Paymaster to pay for gas. Actually, this funds the RelayHub with ETH our Paymaster
    // has the right to spend, since payments to the Paymaster are forwarded
    await web3.eth.sendTransaction({
      from: owner,
      to: this.paymaster.address,
      value: toWei('1', 'ether'),
    });
  });

  // Sending the token is done without GSN
  it('should allow someone to pay with a token', async () => {
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, tokenAmount, { from: payer });
    const receipt = await this.umbra.sendToken(
      receiver,
      this.token.address,
      tokenAmount,
      ...argumentBytes,
      { from: payer, value: toll }
    );

    const contractBalance = await this.token.balanceOf(this.umbra.address);

    expect(contractBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver,
      amount: tokenAmount,
      token: this.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not allow a non-receiver to withdraw tokens with GSN', async () => {
    // This line updates the web3 Provider used by our this.relayRecipient instance for all future calls.
    // Needing to do update it this way is an idiosyncracy of truffle-contract. The important
    // thing is that calls be made using the RelayProvider instantiated previously.
    // By using the RelayProvider instances, tx's sent through this.relayRecipient will now go through GSN.
    UmbraRelayRecipient.web3.setProvider(this.gsnProvider);

    const otherWallet = ethers.Wallet.createRandom();

    const { v, r, s } = await signMetaWithdrawal(otherWallet, relayer, acceptor, relayerTokenFee);

    await expectRevert(
      this.relayRecipient.withdrawTokenOnBehalf(
        otherWallet.address,
        acceptor,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: this.forwarder,
        }
      ),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should not allow an invalid signature to withdraw tokens with GSN', async () => {
    // Technically this is only needed once in the first test, but we repeat it in each test
    // to avoid failures if test ordering is chagned.
    UmbraRelayRecipient.web3.setProvider(this.gsnProvider);

    const otherWallet = ethers.Wallet.createRandom();

    const { v, r, s } = await signMetaWithdrawal(otherWallet, relayer, acceptor, relayerTokenFee);

    await expectRevert(
      this.relayRecipient.withdrawTokenOnBehalf(
        receiverWallet.address,
        acceptor,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: this.forwarder,
        }
      ),
      'Umbra: Invalid Signature'
    );
  });

  it('should allow receiver to withdraw their tokens with GSN', async () => {
    UmbraRelayRecipient.web3.setProvider(this.gsnProvider);

    const { v, r, s } = await signMetaWithdrawal(
      receiverWallet,
      relayer,
      acceptor,
      relayerTokenFee
    );

    await this.relayRecipient.withdrawTokenOnBehalf(
      receiverWallet.address,
      acceptor,
      relayer,
      relayerTokenFee,
      v,
      r,
      s,
      {
        from: relayer,
        // When making a contract call with the RelayProvider, an additional options param is
        // needed: the forwarder that will be used.
        forwarder: this.forwarder,
      }
    );

    const acceptorBalance = await this.token.balanceOf(acceptor);
    expect(acceptorBalance.toString()).to.equal(tokenAccepted);

    const relayerBalance = await this.token.balanceOf(relayer);
    expect(relayerBalance.toString()).to.equal(relayerTokenFee);
  });

  it('should not allow a receiver to withdraw tokens twice with GSN', async () => {
    UmbraRelayRecipient.web3.setProvider(this.gsnProvider);

    const { v, r, s } = await signMetaWithdrawal(
      receiverWallet,
      relayer,
      acceptor,
      relayerTokenFee
    );

    await expectRevert(
      this.relayRecipient.withdrawTokenOnBehalf(
        receiverWallet.address,
        acceptor,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
          // When making a contract call with the RelayProvider, an additional options param is
          // needed: the forwarder that will be used.
          forwarder: this.forwarder,
        }
      ),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });
});
