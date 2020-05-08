const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Umbra = contract.fromArtifact('Umbra');
const TestToken = contract.fromArtifact('TestToken');

const toWei = web3.utils.toWei;
const BN = web3.utils.BN;

describe('Umbra', () => {
    const [
        owner,
        tollCollector,
        tollReceiver,
        payer1,
        receiver1,
        payer2,
        receiver2,
        other,
        ] = accounts;

    const deployedToll = toWei('0.01', 'ether');
    const updatedToll = toWei('0.001', 'ether');
    const ethPayment = toWei('1.6', 'ether');
    const tokenAmount = toWei('100', 'ether');
    const announcement1 = "Now is the time for all good men to come to the aid of their country";
    const announcement2 = "How much wood would a wood chuck chuck?";

    before(async () => {
        this.instance = await Umbra.new(deployedToll, tollCollector, tollReceiver, {from: owner});
        this.token = await TestToken.new('TestToken', 'TT');

        await this.token.mint(payer2, tokenAmount);
    });

    it('should see the deployed Umbra contract', async () => {
        expect(this.instance.address.startsWith('0x')).to.be.true;
        expect(this.instance.address.length).to.equal(42);
        expect(this.token.address.startsWith('0x')).to.be.true;
        expect(this.token.address.length).to.equal(42);
    });

    it('should have correct values initialized', async () => {
        const theOwner = await this.instance.owner();
        expect(theOwner).to.equal(owner);

        const theCollector = await this.instance.tollCollector();
        expect(theCollector).to.equal(tollCollector);

        const theReceiver = await this.instance.tollReceiver();
        expect(theReceiver).to.equal(tollReceiver);

        const toll = await this.instance.toll();
        expect(toll.toString()).to.equal(deployedToll);

        const tokenBalance = await this.token.balanceOf(payer2);
        expect(tokenBalance.toString()).to.equal(tokenAmount);
    });

    it('should let the owner update the toll', async () => {
        await this.instance.setToll(updatedToll, {from: owner});
        const toll = await this.instance.toll();

        expect(toll.toString()).to.equal(updatedToll);
    });

    it('should not allow someone other than the owner to upate the toll', async () => {
        await expectRevert(
            this.instance.setToll(deployedToll, {from: other}),
            "Ownable: caller is not the owner"
        );
    });

    it('should not allow someone to pay less than the toll amount', async () => {
        const toll = await this.instance.toll()
        const paymentAmount = toll.sub(new BN('1'));

        await expectRevert(
            this.instance.sendEth(receiver1, announcement1, {from: payer1, value: paymentAmount}),
            "Umbra: Must pay more than the toll",
        );
    });

    it('should not allow someone to pay exactly the toll amount', async () => {
        const toll = await this.instance.toll()

        await expectRevert(
            this.instance.sendEth(receiver1, announcement1, {from: payer1, value: toll}),
            "Umbra: Must pay more than the toll",
        );
    });

    it('should allow someone to pay in eth', async () => {
        const receiverInitBalance = new BN(await web3.eth.getBalance(receiver1));

        const toll = await this.instance.toll()
        const payment = new BN(ethPayment);
        const actualPayment = payment.sub(toll);

        const receipt = await this.instance.sendEth(receiver1, announcement1, {from: payer1, value: ethPayment})

        const receiverPostBalance = new BN(await web3.eth.getBalance(receiver1));
        const amountReceived = receiverPostBalance.sub(receiverInitBalance);

        expect(amountReceived.toString()).to.equal(actualPayment.toString());

        expectEvent(receipt, "EthAnnouncement", {
            receiver: receiver1,
            amount: actualPayment.toString(),
            note: announcement1,
        });
    });

    it('should not allow someone to pay with a token without sending the toll', async () => {
        await expectRevert(
            this.instance.sendToken(receiver2, announcement2, this.token.address, tokenAmount, {from: payer2}),
            "Umbra: Must pay the exact toll"
        );
    });

    it('should not allow someone to pay with a token without sending the full toll', async () => {
        const toll = await this.instance.toll();
        const lessToll = toll.sub(new BN('1'));

        await expectRevert(
            this.instance.sendToken(receiver2, announcement2, this.token.address, tokenAmount, {from: payer2, value: lessToll}),
            "Umbra: Must pay the exact toll"
        );
    });

    it('should not allow someone to pay with a token sending more than the toll', async () => {
        const toll = await this.instance.toll();
        const moreToll = toll.add(new BN('1'));

        await expectRevert(
            this.instance.sendToken(receiver2, announcement2, this.token.address, tokenAmount, {from: payer2, value: moreToll}),
            "Umbra: Must pay the exact toll"
        );
    });

    it('should allow someone to pay with a token', async () => {
        const toll = await this.instance.toll();
        await this.token.approve(this.instance.address, tokenAmount, {from: payer2});
        const receipt = await this.instance.sendToken(receiver2, announcement2, this.token.address, tokenAmount, {from: payer2, value: toll});

        const receiverBalance = await this.token.balanceOf(receiver2);

        expect(receiverBalance.toString()).to.equal(tokenAmount);

        expectEvent(receipt, "TokenAnnouncement", {
            receiver: receiver2,
            amount: tokenAmount,
            token: this.token.address,
            note: announcement2,
        });
    });
});
