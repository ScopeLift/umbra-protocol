const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Umbra = contract.fromArtifact('Umbra');

describe('Umbra', () => {
    const [ owner ] = accounts;

    before(async () => {
        this.instance = await Umbra.new({from: owner});
    });

    it('should see the deployed Umbra contract', async () => {
        expect(this.instance.address.startsWith('0x')).to.be.true;
        expect(this.instance.address.length).to.equal(42);
    });

    it('should be owned by the deployer', async () => {
        const theOwner = await this.instance.owner();
        expect(theOwner).to.equal(owner);
    });
});
