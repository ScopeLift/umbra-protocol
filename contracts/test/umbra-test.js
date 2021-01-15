const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const ethers = require('ethers');
const { argumentBytes } = require('./sample-data');
const { sumTokenAmounts, signMetaWithdrawal } = require('./utils');

const Umbra = contract.fromArtifact('Umbra');
const TestToken = contract.fromArtifact('TestToken');
const { toWei, BN } = web3.utils;

describe('Umbra', () => {
  const [
    owner,
    tollCollector,
    tollReceiver,
    payer1,
    receiver1,
    payer2,
    receiver2,
    acceptor,
    other,
    relayer,
  ] = accounts;

  // The ethers wallet that will be used when testing meta tx withdrawals
  const metaWallet = ethers.Wallet.createRandom();

  // The EOA that will receive the relayed withdrawal
  const metaAcceptor = ethers.Wallet.createRandom().address;

  // Toll value at contract deployment
  const deployedToll = toWei('0.01', 'ether');

  // Toll value after update by administrator
  const updatedToll = toWei('0.001', 'ether');

  // Eth amounts used in specific payments during test execution
  const ethPayment = toWei('1.6', 'ether');
  const secondEthPayment = toWei('7.5', 'ether');

  // Token amounts used in specific payments during test execution
  const tokenAmount = toWei('100', 'ether');
  const secondTokenAmount = toWei('4.1', 'ether');
  const metaTokenTotal = toWei('200', 'ether');
  const relayerTokenFee = toWei('2', 'ether');
  const metaTokenAccepted = toWei('198', 'ether');

  // The total token amount that will be held by the contract at any one time during test execution
  const totalTokenAmount = sumTokenAmounts([tokenAmount, secondTokenAmount]);

  // The amount of tokens that need to be minted to the payer for full test execution
  const mintTokenAmount = sumTokenAmounts([totalTokenAmount, tokenAmount, metaTokenTotal]);

  before(async () => {
    this.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, { from: owner });
    this.token = await TestToken.new('TestToken', 'TT');

    await this.token.mint(payer2, mintTokenAmount);
  });

  it('should see the deployed Umbra contract', async () => {
    expect(this.umbra.address.startsWith('0x')).to.be.true;
    expect(this.umbra.address.length).to.equal(42);
    expect(this.token.address.startsWith('0x')).to.be.true;
    expect(this.token.address.length).to.equal(42);
  });

  it('should have correct values initialized', async () => {
    const theOwner = await this.umbra.owner();
    expect(theOwner).to.equal(owner);

    const theCollector = await this.umbra.tollCollector();
    expect(theCollector).to.equal(tollCollector);

    const theReceiver = await this.umbra.tollReceiver();
    expect(theReceiver).to.equal(tollReceiver);

    const toll = await this.umbra.toll();
    expect(toll.toString()).to.equal(deployedToll);

    const tokenBalance = await this.token.balanceOf(payer2);
    expect(tokenBalance.toString()).to.equal(mintTokenAmount);
  });

  it('should let the owner update the toll', async () => {
    await this.umbra.setToll(updatedToll, { from: owner });
    const toll = await this.umbra.toll();

    expect(toll.toString()).to.equal(updatedToll);
  });

  it('should not allow someone other than the owner to update the toll', async () => {
    await expectRevert(
      this.umbra.setToll(deployedToll, { from: other }),
      'Ownable: caller is not the owner',
    );
  });

  it('should not allow someone to pay less than the toll amount', async () => {
    const toll = await this.umbra.toll();
    const paymentAmount = toll.sub(new BN('1'));

    await expectRevert(
      this.umbra.sendEth(receiver1, ...argumentBytes, { from: payer1, value: paymentAmount }),
      'Umbra: Must pay more than the toll',
    );
  });

  it('should not allow someone to pay exactly the toll amount', async () => {
    const toll = await this.umbra.toll();

    await expectRevert(
      this.umbra.sendEth(receiver1, ...argumentBytes, { from: payer1, value: toll }),
      'Umbra: Must pay more than the toll',
    );
  });

  it('should allow someone to pay in eth', async () => {
    const receiverInitBalance = new BN(await web3.eth.getBalance(receiver1));

    const toll = await this.umbra.toll();
    const payment = new BN(ethPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await this.umbra.sendEth(receiver1, ...argumentBytes, {
      from: payer1,
      value: ethPayment,
    });

    const receiverPostBalance = new BN(await web3.eth.getBalance(receiver1));
    const amountReceived = receiverPostBalance.sub(receiverInitBalance);

    expect(amountReceived.toString()).to.equal(actualPayment.toString());

    expectEvent(receipt, 'Announcement', {
      receiver: receiver1,
      amount: actualPayment.toString(),
      token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should allow someone to send to the ETH receiver twice', async () => {
    const receiverInitBalance = new BN(await web3.eth.getBalance(receiver1));

    const toll = await this.umbra.toll();
    const payment = new BN(secondEthPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await this.umbra.sendEth(receiver1, ...argumentBytes, {
      from: payer1,
      value: secondEthPayment,
    });

    const receiverPostBalance = new BN(await web3.eth.getBalance(receiver1));
    const amountReceived = receiverPostBalance.sub(receiverInitBalance);

    expect(amountReceived.toString()).to.equal(actualPayment.toString());

    expectEvent(receipt, 'Announcement', {
      receiver: receiver1,
      amount: actualPayment.toString(),
      token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not let the eth receiver withdraw tokens', async () => {
    await expectRevert(
      this.umbra.withdrawToken(acceptor, { from: receiver1 }),
      'Umbra: No tokens available for withdrawal',
    );
  });

  it('should not allow someone to pay with a token without sending the toll', async () => {
    await expectRevert(
      this.umbra.sendToken(receiver2, this.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
      }),
      'Umbra: Must pay the exact toll',
    );
  });

  it('should not allow someone to pay with a token without sending the full toll', async () => {
    const toll = await this.umbra.toll();
    const lessToll = toll.sub(new BN('1'));

    await expectRevert(
      this.umbra.sendToken(receiver2, this.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: lessToll,
      }),
      'Umbra: Must pay the exact toll',
    );
  });

  it('should not allow someone to pay with a token sending more than the toll', async () => {
    const toll = await this.umbra.toll();
    const moreToll = toll.add(new BN('1'));

    await expectRevert(
      this.umbra.sendToken(receiver2, this.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: moreToll,
      }),
      'Umbra: Must pay the exact toll',
    );
  });

  it('should allow someone to pay with a token', async () => {
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, tokenAmount, { from: payer2 });
    const receipt = await this.umbra.sendToken(
      receiver2,
      this.token.address,
      tokenAmount,
      ...argumentBytes,
      { from: payer2, value: toll },
    );

    const contractBalance = await this.token.balanceOf(this.umbra.address);

    expect(contractBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver2,
      amount: tokenAmount,
      token: this.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should allow someone to pay tokens to a previous ETH receiver', async () => {
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, secondTokenAmount, { from: payer2 });
    const receipt = await this.umbra.sendToken(
      receiver1,
      this.token.address,
      secondTokenAmount,
      ...argumentBytes,
      { from: payer2, value: toll },
    );

    const contractBalance = await this.token.balanceOf(this.umbra.address);

    expect(contractBalance.toString()).to.equal(totalTokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver1,
      amount: secondTokenAmount,
      token: this.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not allow someone to pay a token to a reused address', async () => {
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, tokenAmount, { from: payer2 });

    await expectRevert(
      this.umbra.sendToken(receiver2, this.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: toll,
      }),
      'Umbra: Cannot send more tokens to stealth address',
    );
  });

  it('should allow someone to send ETH to a previous Token receiver', async () => {
    const receiverInitBalance = new BN(await web3.eth.getBalance(receiver2));

    const toll = await this.umbra.toll();
    const payment = new BN(secondEthPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await this.umbra.sendEth(receiver2, ...argumentBytes, {
      from: payer1,
      value: secondEthPayment,
    });

    const receiverPostBalance = new BN(await web3.eth.getBalance(receiver2));
    const amountReceived = receiverPostBalance.sub(receiverInitBalance);

    expect(amountReceived.toString()).to.equal(actualPayment.toString());

    expectEvent(receipt, 'Announcement', {
      receiver: receiver2,
      amount: actualPayment.toString(),
      token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not allow a non-receiver to withdraw tokens', async () => {
    await expectRevert(
      this.umbra.withdrawToken(acceptor, { from: other }),
      'Umbra: No tokens available for withdrawal',
    );
  });

  it('should allow receiver to withdraw their token', async () => {
    const receipt = await this.umbra.withdrawToken(acceptor, { from: receiver2 });

    const acceptorBalance = await this.token.balanceOf(acceptor);

    expect(acceptorBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'TokenWithdrawal', {
      receiver: receiver2,
      acceptor,
      amount: tokenAmount,
      token: this.token.address,
    });
  });

  it('should not allow a receiver to withdraw their tokens twice', async () => {
    await expectRevert(
      this.umbra.withdrawToken(acceptor, { from: receiver2 }),
      'Umbra: No tokens available for withdraw',
    );
  });

  it('should allow someone to pay a token to a reused address after withdraw', async () => {
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, tokenAmount, { from: payer2 });

    const receipt = await this.umbra.sendToken(
      receiver2,
      this.token.address,
      tokenAmount,
      ...argumentBytes,
      { from: payer2, value: toll },
    );

    const contractBalance = await this.token.balanceOf(this.umbra.address);

    expect(contractBalance.toString()).to.equal(totalTokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver2,
      amount: tokenAmount,
      token: this.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should revert on a meta withdrawal when the stealth address does not have a balance', async () => {
    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      relayer,
      metaAcceptor,
      relayerTokenFee,
    );

    await expectRevert(
      this.umbra.withdrawMeta(metaWallet.address, relayer, metaAcceptor, relayerTokenFee, v, r, s, {
        from: relayer,
      }),
      'Umbra: No tokens available for withdrawal',
    );
  });

  it('should revert on meta withdrawal signed by the wrong address', async () => {
    // Send the payment
    const toll = await this.umbra.toll();
    await this.token.approve(this.umbra.address, metaTokenTotal, { from: payer2 });
    await this.umbra.sendToken(
      metaWallet.address,
      this.token.address,
      metaTokenTotal,
      ...argumentBytes,
      { from: payer2, value: toll },
    );

    const wrongWallet = ethers.Wallet.createRandom();
    const { v, r, s } = await signMetaWithdrawal(
      wrongWallet,
      relayer,
      metaAcceptor,
      relayerTokenFee,
    );

    await expectRevert(
      this.umbra.withdrawMeta(metaWallet.address, relayer, metaAcceptor, relayerTokenFee, v, r, s, {
        from: relayer,
      }),
      'Umbra: Invalid Signature',
    );
  });

  it('should revert on meta withdrawal if the fee is more than the amount', async () => {
    const bigFee = sumTokenAmounts([metaTokenTotal, '100']);

    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      relayer,
      metaAcceptor,
      relayerTokenFee,
    );

    await expectRevert(
      this.umbra.withdrawMeta(metaWallet.address, relayer, metaAcceptor, bigFee, v, r, s, {
        from: relayer,
      }),
      'Umbra: Relay fee exceeds balance',
    );
  });

  it('perform a withdrawal when given a properly signed meta-tx', async () => {
    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      relayer,
      metaAcceptor,
      relayerTokenFee,
    );

    const receipt = await this.umbra.withdrawMeta(
      metaWallet.address,
      relayer,
      metaAcceptor,
      relayerTokenFee,
      v,
      r,
      s,
      { from: relayer },
    );

    const acceptorBalance = await this.token.balanceOf(metaAcceptor);
    expect(acceptorBalance.toString()).to.equal(metaTokenAccepted);

    const relayerBalance = await this.token.balanceOf(relayer);
    expect(relayerBalance.toString()).to.equal(relayerTokenFee);

    expectEvent(receipt, 'TokenWithdrawal');
  });

  it('should not allow someone else to move tolls to toll receiver', async () => {
    await expectRevert(this.umbra.collectTolls({ from: other }), 'Umbra: Not Toll Collector');
  });

  it('should allow the toll collector to move tolls to toll receiver', async () => {
    const toll = await this.umbra.toll();
    const expectedCollection = toll.mul(new BN('7'));
    const receiverInitBalance = new BN(await web3.eth.getBalance(tollReceiver));

    await this.umbra.collectTolls({ from: tollCollector });

    const receiverPostBalance = new BN(await web3.eth.getBalance(tollReceiver));
    const tollsReceived = receiverPostBalance.sub(receiverInitBalance);

    expect(tollsReceived.toString()).to.equal(expectedCollection.toString());
  });
});
