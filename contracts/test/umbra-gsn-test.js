const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Umbra = contract.fromArtifact('Umbra');
const UmbraPaymaster = contract.fromArtifact('UmbraPaymaster');
const TestToken = contract.fromArtifact('TestToken');

const { RelayProvider } = require('@opengsn/gsn/dist/src/relayclient/RelayProvider');
const { GsnTestEnvironment } = require('@opengsn/gsn/dist/GsnTestEnvironment');
const { configureGSN } = require('@opengsn/gsn/dist/src/relayclient/GSNConfigurator');

const { argumentBytes } = require('./sample-data');

const { toWei } = web3.utils;
const origProvider = web3.currentProvider;

const tokenAmount = toWei('100', 'ether');

describe('Umbra GSN', () => {
  const [owner, tollCollector, tollReceiver, payer, receiver, acceptor, other] = accounts;

  const deployedToll = toWei('0.001', 'ether');

  before(async () => {
    // Deploy the Umbra contracts
    this.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, other, { from: owner });
    this.paymaster = await UmbraPaymaster.new(this.umbra.address, { from: owner });

    // Mint tokens needed for test
    this.token = await TestToken.new('TestToken', 'TT');
    await this.token.mint(payer, tokenAmount);

    // Start the GSN Test environment— this includes deployment of a relay hub, a forwarder, and
    // a stake manager, as well as starting a relay server. It also deploys a naive Paymaster, but we
    // will use our own
    const gsnInstance = await GsnTestEnvironment.startGsn(
      Umbra.web3.currentProvider.wrappedProvider.host,
    );

    // Save the forwader, as we'll need it when sending contract calls via our RelayProvider
    this.forwarder = gsnInstance.deploymentResult.forwarderAddress;

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

    // Set our trusted forwarder in the umbra contract, which is part of the
    // BaseRelayRecipient it inherits from.
    await this.umbra.setForwarder(this.forwarder, { from: owner });

    // Fund our Paymaster to pay for gas. Actually, this funds the RelayHub with ETH our Paymaster
    // has the right to spend, since payments to the Paymaster are forwarded
    await web3.eth.sendTransaction({
      from: owner,
      to: this.paymaster.address,
      value: toWei('1', 'ether'),
    });
  });

  // Drain the receiver's balance to ensure later that it is able to withdraw the
  // tokens sent to it without having to pay anything for gas.
  it("should drain the receiver's balance", async () => {
    const receiverBalance = await web3.eth.getBalance(receiver);
    await web3.eth.sendTransaction({
      from: receiver,
      to: owner,
      value: receiverBalance,
      gasPrice: 0,
    });

    const newBalance = await web3.eth.getBalance(receiver);

    expect(newBalance.toString()).to.equal('0');
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
      { from: payer, value: toll },
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
    // This line updates the web3 Provider used by our this.umbra instance for all future calls.
    // Needing to do update it this way is an idiosyncracy of truffle-contract. The important
    // thing is that calls be made using the RelayProvider instantiated previously.
    // By using the RelayProvider instances, tx's sent through this.umbra will now go through GSN.
    Umbra.web3.setProvider(this.gsnProvider);

    await expectRevert(
      this.umbra.withdrawToken(acceptor, {
        from: other,
        forwarder: this.forwarder,
      }),
      'Umbra: No tokens available for withdrawal',
    );
  });

  it('should allow receiver to withdraw their tokens with GSN', async () => {
    // Technically this is only needed once in the first test, but we repeat it in each test
    // to avoid failures if test ordering is chagned.
    Umbra.web3.setProvider(this.gsnProvider);

    const receipt = await this.umbra.withdrawToken(acceptor, {
      from: receiver,
      // When making a contract call with the RelayProvider, an additional options param is
      // needed: the forwarder that will be used.
      forwarder: this.forwarder,
    });

    const acceptorBalance = await this.token.balanceOf(acceptor);

    expect(acceptorBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'TokenWithdrawal', {
      receiver,
      acceptor,
      amount: tokenAmount,
      token: this.token.address,
    });
  });

  it('should not allow a receiver to withdraw tokens twice with GSN', async () => {
    Umbra.web3.setProvider(this.gsnProvider);

    await expectRevert(
      this.umbra.withdrawToken(acceptor, {
        from: receiver,
        forwarder: this.forwarder,
      }),
      'Umbra: No tokens available for withdrawal',
    );
  });
});
