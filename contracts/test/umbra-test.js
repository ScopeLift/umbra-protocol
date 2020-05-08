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
        payer1,
        receiver1,
        other,
        ] = accounts;

    const deployedToll = toWei('0.01', 'ether');
    const updatedToll = toWei('0.001', 'ether');
    const ethPayment = toWei('1.6', 'ether');
    const announcement1 = "Now is the time for all good men to come to the aid of their country";

    before(async () => {
        this.instance = await Umbra.new(deployedToll, {from: owner});
        this.token = await TestToken.new();
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

        const toll = await this.instance.toll();
        expect(toll.toString()).to.equal(deployedToll);
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

        expectEvent(receipt, "Announcement", {
            receiver: receiver1,
            amount: actualPayment.toString(),
            note: announcement1,
        });
    });
});
