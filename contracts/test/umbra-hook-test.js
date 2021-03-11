const { ethers, web3, artifacts } = require('hardhat');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { argumentBytes } = require('./sample-data');
const { sumTokenAmounts, signMetaWithdrawal } = require('./utils');

const Umbra = artifacts.require('Umbra');
const TestToken = artifacts.require('TestToken');
const MockHook = artifacts.require('MockHook');
const { toWei, fromWei, BN } = web3.utils;
const AddressZero = ethers.constants.AddressZero;

describe('Umbra Hooks', () => {
  const ctx = {};
  let owner, sender, receiver, acceptor;

  const toll = toWei('0.01', 'ether');

  // helper function to mint test tokens
  const mintToken = async (toAddr, amount) => {
    await ctx.token.mint(toAddr, toWei(amount));
  };

  // helper function to send test tokens to stealth address
  const sendToken = async (fromAddr, stealthAddr, amount) => {
    const toll = await ctx.umbra.toll();
    const weiAmount = toWei(amount);

    await ctx.token.approve(ctx.umbra.address, weiAmount, { from: fromAddr });

    await ctx.umbra.sendToken(stealthAddr, ctx.token.address, weiAmount, ...argumentBytes, {
      from: fromAddr,
      value: toll,
    });
  };

  // helper function to mint and send tokens to steatlh address
  const mintAndSendToken = async (fromAddr, stealthAddr, amount) => {
    await mintToken(fromAddr, amount);
    await sendToken(fromAddr, stealthAddr, amount);
  };

  beforeEach(async () => {
    [owner, sender, receiver, acceptor] = await web3.eth.getAccounts();

    ctx.umbra = await Umbra.new(toll, owner, owner, { from: owner });
    ctx.token = await TestToken.new('TestToken', 'TT');
    ctx.hook = await MockHook.new();
  });

  it('should see the deployed Umbra contract', async () => {
    expect(ctx.umbra.address.startsWith('0x')).to.be.true;
    expect(ctx.umbra.address.length).to.equal(42);
    expect(ctx.token.address.startsWith('0x')).to.be.true;
    expect(ctx.token.address.length).to.equal(42);
    expect(ctx.hook.address.startsWith('0x')).to.be.true;
    expect(ctx.hook.address.length).to.equal(42);
  });

  it('should call the hook contract when the stealth receiver withdraws directly', async () => {
    await mintAndSendToken(sender, receiver, '100');

    await ctx.umbra.withdrawTokenAndCall(acceptor, ctx.token.address, ctx.hook.address, '0xbeefc0ffee', {
      from: receiver,
    });

    const callData = await ctx.hook.lastCallData();

    expect(fromWei(callData.amount)).to.equal('100');
    expect(callData.stealthAddr).to.equal(receiver);
    expect(callData.acceptor).to.equal(acceptor);
    expect(callData.tokenAddr).to.equal(ctx.token.address);
    expect(callData.sponsor).to.equal(AddressZero);
    expect(callData.sponsorFee.toString()).to.equal('0');
    expect(callData.data).to.equal('0xbeefc0ffee');

    const balance = await ctx.token.balanceOf(acceptor);
    expect(fromWei(balance)).to.equal('100');
  });

  it('should call the hook contract when the stealth receiver withdraws directly with empty data', async () => {
    await mintAndSendToken(sender, receiver, '100');

    await ctx.umbra.withdrawTokenAndCall(acceptor, ctx.token.address, ctx.hook.address, [], {
      from: receiver,
    });

    const callData = await ctx.hook.lastCallData();

    expect(fromWei(callData.amount)).to.equal('100');
    expect(callData.stealthAddr).to.equal(receiver);
    expect(callData.acceptor).to.equal(acceptor);
    expect(callData.tokenAddr).to.equal(ctx.token.address);
    expect(callData.sponsor).to.equal(AddressZero);
    expect(callData.sponsorFee.toString()).to.equal('0');
    expect(callData.data).to.equal(null);

    const balance = await ctx.token.balanceOf(acceptor);
    expect(fromWei(balance)).to.equal('100');
  });

  it('should not call the hook if the hook address is 0', async () => {
    await mintAndSendToken(sender, receiver, '100');

    await ctx.umbra.withdrawTokenAndCall(acceptor, ctx.token.address, AddressZero, '0xbeefc0ffee', {
      from: receiver,
    });

    const callData = await ctx.hook.lastCallData();

    // call data in the mock trigger is just still zeroes
    expect(fromWei(callData.amount)).to.equal('0');
    expect(callData.stealthAddr).to.equal(AddressZero);
    expect(callData.acceptor).to.equal(AddressZero);
    expect(callData.tokenAddr).to.equal(AddressZero);
    expect(callData.sponsor).to.equal(AddressZero);
    expect(callData.sponsorFee.toString()).to.equal('0');
    expect(callData.data).to.equal(null);

    // the withdrawal  transfer should still work
    const balance = await ctx.token.balanceOf(acceptor);
    expect(fromWei(balance)).to.equal('100');
  });

  it('should call the hook contract when the stealth receiver withdraws directly to the hook contract', async () => {
    await mintAndSendToken(sender, receiver, '100');

    await ctx.umbra.withdrawTokenAndCall(ctx.hook.address, ctx.token.address, ctx.hook.address, '0xbeefc0ffee', {
      from: receiver,
    });

    const callData = await ctx.hook.lastCallData();

    expect(fromWei(callData.amount)).to.equal('100');
    expect(callData.stealthAddr).to.equal(receiver);
    expect(callData.acceptor).to.equal(ctx.hook.address);
    expect(callData.tokenAddr).to.equal(ctx.token.address);
    expect(callData.sponsor).to.equal(AddressZero);
    expect(callData.sponsorFee.toString()).to.equal('0');
    expect(callData.data).to.equal('0xbeefc0ffee');

    const balance = await ctx.token.balanceOf(ctx.hook.address);
    expect(fromWei(balance)).to.equal('100');
  });
});
