const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Umbra = contract.fromArtifact('Umbra');

const toWei = web3.utils.toWei;

describe('Umbra', () => {
    const [ owner, other, ] = accounts;

    const deployedToll = toWei('0.01', 'ether');
    const updatedToll = toWei('0.001', 'ether');

    before(async () => {
        this.instance = await Umbra.new(deployedToll, {from: owner});
    });

    it('should see the deployed Umbra contract', async () => {
        expect(this.instance.address.startsWith('0x')).to.be.true;
        expect(this.instance.address.length).to.equal(42);
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
});
