const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Umbra = contract.fromArtifact('Umbra');
const UmbraPaymaster = contract.fromArtifact('UmbraPaymaster');

const toWei = web3.utils.toWei;
const BN = web3.utils.BN;

describe('Umbra GSN', () => {
    const [
        owner,
        tollCollector,
        tollReceiver,
        ] = accounts;

    const deployedToll = toWei('0.001', 'ether');

    before(async () => {
        this.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, {from: owner});
        this.paymaster = await UmbraPaymaster.new(this.umbra.address, {from: owner});
    });

    it('should know the truth', async () => {
        expect(true).to.be.true;
    });
});