const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const GasTester = contract.fromArtifact('GasTester');

const toWei = web3.utils.toWei;
const BN = web3.utils.BN;

function randomBytes(length) {
    var result           = '';
    var characters       = 'ABCDEFabcdef0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length*2; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `${result}`;
 }

describe('Gas Tests', () => {
    [ user ] = accounts;

    before(async () => {
        this.instance = await GasTester.new();
    });

    it('should test the bytes32 option', async () => {
        console.log("TESTING 7 bytes32 ARGUMENTS");

        let bytes = [];
        for (let i = 0; i < 7; i++) {
            bytes.push(`0x${randomBytes(32)}`);
        }

        let tx = await this.instance.manyBytes(...bytes, {from: user, value: toWei('1', 'ether'), gasPrice: 1});
        console.log("GAS USED --->", tx.receipt.gasUsed);
    });

    it('should test the option with one bytes16 param', async () => {
        console.log("TESTING 6 bytes32 + 1 bytes16 ARGUMENTS");

        let bytes = [];
        for (let i = 0; i < 6; i++) {
            bytes.push(`0x${randomBytes(32)}`);
        }

        bytes.push(`0x${randomBytes(16)}`);

        let tx = await this.instance.halfByte(...bytes, {from: user, value: toWei('1', 'ether'), gasPrice: 1});
        console.log("GAS USED --->", tx.receipt.gasUsed);
    });

    it('should test the big string option', async () => {
        console.log("TESTING BIG string ARGUMENT");
        let strBytes = randomBytes(208);
        let tx = await this.instance.bigString(strBytes, {from: user, value: toWei('1', 'ether'), gasPrice: 1});
        console.log("GAS USED --->", tx.receipt.gasUsed);
    });
});