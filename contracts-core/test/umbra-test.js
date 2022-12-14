const { ethers, web3, artifacts } = require('hardhat');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { argumentBytes } = require('./sample-data');
const { sumTokenAmounts, signMetaWithdrawal } = require('./utils');

const Umbra = artifacts.require('Umbra');
const TestToken = artifacts.require('TestToken');
const { toWei, BN } = web3.utils; // eslint-disable-line @typescript-eslint/unbound-method

describe('Umbra', () => {
  const ctx = {};
  let owner, tollCollector, tollReceiver, payer1, receiver1, payer2, receiver2, acceptor, other, relayer;

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
    [owner, tollCollector, tollReceiver, payer1, receiver1, payer2, receiver2, acceptor, other, relayer] =
      await web3.eth.getAccounts();
    ctx.chainId = await web3.eth.getChainId();
    ctx.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, { from: owner });
    ctx.token = await TestToken.new('TestToken', 'TT');

    await ctx.token.mint(payer2, mintTokenAmount);
  });

  it('should see the deployed Umbra contract', () => {
    expect(ctx.umbra.address.startsWith('0x')).to.be.true;
    expect(ctx.umbra.address.length).to.equal(42);
    expect(ctx.token.address.startsWith('0x')).to.be.true;
    expect(ctx.token.address.length).to.equal(42);
  });

  it('should have correct values initialized', async () => {
    const theOwner = await ctx.umbra.owner();
    expect(theOwner).to.equal(owner);

    const theCollector = await ctx.umbra.tollCollector();
    expect(theCollector).to.equal(tollCollector);

    const theReceiver = await ctx.umbra.tollReceiver();
    expect(theReceiver).to.equal(tollReceiver);

    const toll = await ctx.umbra.toll();
    expect(toll.toString()).to.equal(deployedToll);

    const tokenBalance = await ctx.token.balanceOf(payer2);
    expect(tokenBalance.toString()).to.equal(mintTokenAmount);
  });

  it('should let the owner update the toll', async () => {
    await ctx.umbra.setToll(updatedToll, { from: owner });
    const toll = await ctx.umbra.toll();

    expect(toll.toString()).to.equal(updatedToll);
  });

  it('should not allow someone other than the owner to update the toll', async () => {
    await expectRevert(ctx.umbra.setToll(deployedToll, { from: other }), 'Ownable: caller is not the owner');
  });

  it('should not allow someone to pay less than the toll amount', async () => {
    const toll = await ctx.umbra.toll();
    const paymentAmount = toll.sub(new BN('1'));

    await expectRevert(
      ctx.umbra.sendEth(receiver1, toll, ...argumentBytes, { from: payer1, value: paymentAmount }),
      'Umbra: Must pay more than the toll'
    );
  });

  it('should not allow someone to pay exactly the toll amount', async () => {
    const toll = await ctx.umbra.toll();

    await expectRevert(
      ctx.umbra.sendEth(receiver1, toll, ...argumentBytes, { from: payer1, value: toll }),
      'Umbra: Must pay more than the toll'
    );
  });

  it('should not allow an eth payment that commits to the wrong toll', async () => {
    await expectRevert(
      ctx.umbra.sendEth(receiver1, deployedToll, ...argumentBytes, {
        from: payer1,
        value: ethPayment,
      }),
      'Umbra: Invalid or outdated toll commitment'
    );
  });

  it('should allow someone to pay in eth', async () => {
    const receiverInitBalance = new BN(await web3.eth.getBalance(receiver1));

    const toll = await ctx.umbra.toll();
    const payment = new BN(ethPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await ctx.umbra.sendEth(receiver1, toll, ...argumentBytes, {
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

    const toll = await ctx.umbra.toll();
    const payment = new BN(secondEthPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await ctx.umbra.sendEth(receiver1, toll, ...argumentBytes, {
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
      ctx.umbra.withdrawToken(acceptor, ctx.token.address, { from: receiver1 }),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should not allow someone to pay with a token without sending the toll', async () => {
    await expectRevert(
      ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
      }),
      'Umbra: Must pay the exact toll'
    );
  });

  it('should not allow someone to pay with a token without sending the full toll', async () => {
    const toll = await ctx.umbra.toll();
    const lessToll = toll.sub(new BN('1'));

    await expectRevert(
      ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: lessToll,
      }),
      'Umbra: Must pay the exact toll'
    );
  });

  it('should not allow someone to pay with a token sending more than the toll', async () => {
    const toll = await ctx.umbra.toll();
    const moreToll = toll.add(new BN('1'));

    await expectRevert(
      ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: moreToll,
      }),
      'Umbra: Must pay the exact toll'
    );
  });

  it('should allow someone to pay with a token', async () => {
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, tokenAmount, { from: payer2 });
    const receipt = await ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
      from: payer2,
      value: toll,
    });

    const contractBalance = await ctx.token.balanceOf(ctx.umbra.address);

    expect(contractBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver2,
      amount: tokenAmount,
      token: ctx.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should allow someone to pay tokens to a previous ETH receiver', async () => {
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, secondTokenAmount, { from: payer2 });
    const receipt = await ctx.umbra.sendToken(receiver1, ctx.token.address, secondTokenAmount, ...argumentBytes, {
      from: payer2,
      value: toll,
    });

    const contractBalance = await ctx.token.balanceOf(ctx.umbra.address);

    expect(contractBalance.toString()).to.equal(totalTokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver1,
      amount: secondTokenAmount,
      token: ctx.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should not allow someone to pay a token to a reused address', async () => {
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, tokenAmount, { from: payer2 });

    await expectRevert(
      ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
        from: payer2,
        value: toll,
      }),
      'Umbra: Cannot send more tokens to stealth address'
    );
  });

  it('should allow someone to send ETH to a previous Token receiver', async () => {
    const receiverInitBalance = new BN(await web3.eth.getBalance(receiver2));

    const toll = await ctx.umbra.toll();
    const payment = new BN(secondEthPayment);
    const actualPayment = payment.sub(toll);

    const receipt = await ctx.umbra.sendEth(receiver2, toll, ...argumentBytes, {
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
      ctx.umbra.withdrawToken(acceptor, ctx.token.address, { from: other }),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should allow receiver to withdraw their token', async () => {
    const receipt = await ctx.umbra.withdrawToken(acceptor, ctx.token.address, { from: receiver2 });

    const acceptorBalance = await ctx.token.balanceOf(acceptor);

    expect(acceptorBalance.toString()).to.equal(tokenAmount);

    expectEvent(receipt, 'TokenWithdrawal', {
      receiver: receiver2,
      acceptor,
      amount: tokenAmount,
      token: ctx.token.address,
    });
  });

  it('should not allow a receiver to withdraw their tokens twice', async () => {
    await expectRevert(
      ctx.umbra.withdrawToken(acceptor, ctx.token.address, { from: receiver2 }),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should allow someone to pay a token to a reused address after withdraw', async () => {
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, tokenAmount, { from: payer2 });

    const receipt = await ctx.umbra.sendToken(receiver2, ctx.token.address, tokenAmount, ...argumentBytes, {
      from: payer2,
      value: toll,
    });

    const contractBalance = await ctx.token.balanceOf(ctx.umbra.address);

    expect(contractBalance.toString()).to.equal(totalTokenAmount);

    expectEvent(receipt, 'Announcement', {
      receiver: receiver2,
      amount: tokenAmount,
      token: ctx.token.address,
      pkx: argumentBytes[0],
      ciphertext: argumentBytes[1],
    });
  });

  it('should revert on a meta withdrawal when the stealth address does not have a balance', async () => {
    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      ctx.chainId,
      ctx.umbra.address,
      metaAcceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await expectRevert(
      ctx.umbra.withdrawTokenOnBehalf(
        metaWallet.address,
        metaAcceptor,
        ctx.token.address,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
        }
      ),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('should revert on meta withdrawal signed by the wrong address', async () => {
    // Send the payment
    const toll = await ctx.umbra.toll();
    await ctx.token.approve(ctx.umbra.address, metaTokenTotal, { from: payer2 });
    await ctx.umbra.sendToken(metaWallet.address, ctx.token.address, metaTokenTotal, ...argumentBytes, {
      from: payer2,
      value: toll,
    });

    const wrongWallet = ethers.Wallet.createRandom();
    const { v, r, s } = await signMetaWithdrawal(
      wrongWallet,
      ctx.chainId,
      ctx.umbra.address,
      metaAcceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    await expectRevert(
      ctx.umbra.withdrawTokenOnBehalf(
        metaWallet.address,
        metaAcceptor,
        ctx.token.address,
        relayer,
        relayerTokenFee,
        v,
        r,
        s,
        {
          from: relayer,
        }
      ),
      'Umbra: Invalid Signature'
    );
  });

  it('should revert on meta withdrawal if the fee is more than the amount', async () => {
    const bigFee = sumTokenAmounts([metaTokenTotal, '100']);

    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      ctx.chainId,
      ctx.umbra.address,
      metaAcceptor,
      ctx.token.address,
      relayer,
      bigFee
    );

    await expectRevert(
      ctx.umbra.withdrawTokenOnBehalf(metaWallet.address, metaAcceptor, ctx.token.address, relayer, bigFee, v, r, s, {
        from: relayer,
      }),
      'Umbra: No balance to withdraw or fee exceeds balance'
    );
  });

  it('perform a withdrawal when given a properly signed meta-tx', async () => {
    const { v, r, s } = await signMetaWithdrawal(
      metaWallet,
      ctx.chainId,
      ctx.umbra.address,
      metaAcceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee
    );

    const receipt = await ctx.umbra.withdrawTokenOnBehalf(
      metaWallet.address,
      metaAcceptor,
      ctx.token.address,
      relayer,
      relayerTokenFee,
      v,
      r,
      s,
      { from: relayer }
    );

    const acceptorBalance = await ctx.token.balanceOf(metaAcceptor);
    expect(acceptorBalance.toString()).to.equal(metaTokenAccepted);

    const relayerBalance = await ctx.token.balanceOf(relayer);
    expect(relayerBalance.toString()).to.equal(relayerTokenFee);

    expectEvent(receipt, 'TokenWithdrawal');
  });

  it('should not allow someone else to move tolls to toll receiver', async () => {
    await expectRevert(ctx.umbra.collectTolls({ from: other }), 'Umbra: Not toll collector');
  });

  it('should allow the toll collector to move tolls to toll receiver', async () => {
    const toll = await ctx.umbra.toll();
    const expectedCollection = toll.mul(new BN('7'));
    const receiverInitBalance = new BN(await web3.eth.getBalance(tollReceiver));

    await ctx.umbra.collectTolls({ from: tollCollector });

    const receiverPostBalance = new BN(await web3.eth.getBalance(tollReceiver));
    const tollsReceived = receiverPostBalance.sub(receiverInitBalance);

    expect(tollsReceived.toString()).to.equal(expectedCollection.toString());
  });
});
