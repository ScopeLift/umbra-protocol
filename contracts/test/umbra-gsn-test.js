const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Umbra = contract.fromArtifact('Umbra');
const UmbraPaymaster = contract.fromArtifact('UmbraPaymaster');
const TestToken = contract.fromArtifact('TestToken');
const { argumentBytes } = require('./sample-data');

const RelayProvider = require("@opengsn/gsn/dist/src/relayclient/").RelayProvider
const gsnTestEnv = require('@opengsn/gsn/dist/GsnTestEnvironment').default
const configureGSN = require('@opengsn/gsn/dist/src/relayclient/GSNConfigurator').configureGSN

const toWei = web3.utils.toWei;
const origProvider = web3.currentProvider;

const tokenAmount = toWei('100', 'ether');

describe('Umbra GSN', () => {
    const [
        owner,
        tollCollector,
        tollReceiver,
        payer,
        receiver,
        acceptor,
        ] = accounts;

    const deployedToll = toWei('0.001', 'ether');

    before(async () => {
        this.umbra = await Umbra.new(deployedToll, tollCollector, tollReceiver, {from: owner});
        this.token = await TestToken.new('TestToken', 'TT');

        await this.token.mint(payer, tokenAmount);

        this.paymaster = await UmbraPaymaster.new(this.umbra.address, {from: owner});
        const gsnInstance = await gsnTestEnv.startGsn(Umbra.web3.currentProvider.wrappedProvider.host);

        this.forwarder = gsnInstance.deploymentResult.forwarderAddress;
        const gsnConfigParams = {
            gasPriceFactorPercent: 70,
            // methodSuffix: '_v4',
            // jsonStringifyRequest: true,
            // chainId: '*',
            relayLookupWindowBlocks: 1e5,
            preferredRelays: [ gsnInstance.relayUrl ],
            relayHubAddress: gsnInstance.deploymentResult.relayHubAddress,
            stakeManagerAddress: gsnInstance.deploymentResult.stakeManagerAddress,
            paymasterAddress: this.paymaster.address,
            verbose: false,
        };

        const gsnConfig = configureGSN(gsnConfigParams);
        this.gsnProvider = new RelayProvider(origProvider, gsnConfig);

        await this.paymaster.setRelayHub(gsnInstance.deploymentResult.relayHubAddress, {from: owner});
        await this.umbra.setForwarder(this.forwarder, {from: owner});

        await web3.eth.sendTransaction({
            from: owner,
            to: this.paymaster.address,
            value: toWei('1', 'ether'),
        });
    });

    it('should drain the receiver\'s balance', async () => {
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

    it('should allow someone to pay with a token', async () => {
        const toll = await this.umbra.toll();
        await this.token.approve(this.umbra.address, tokenAmount, {from: payer});
        const receipt = await this.umbra.sendToken(receiver, this.token.address, tokenAmount, ...argumentBytes, {from: payer, value: toll});

        const contractBalance = await this.token.balanceOf(this.umbra.address);

        expect(contractBalance.toString()).to.equal(tokenAmount);

        expectEvent(receipt, "Announcement", {
            receiver: receiver,
            amount: tokenAmount,
            token: this.token.address,
            iv:  argumentBytes[0],
            pkx: argumentBytes[1],
            pky: argumentBytes[2],
            ct0: argumentBytes[3],
            ct1: argumentBytes[4],
            ct2: argumentBytes[5],
            mac: argumentBytes[6],
        });
    });

    it('should allow receiver to withdraw their tokens with GSN', async () => {
        Umbra.web3.setProvider(this.gsnProvider);

        const receipt = await this.umbra.withdrawToken(acceptor, {
            from: receiver,
            forwarder: this.forwarder,
        });

        const acceptorBalance = await this.token.balanceOf(acceptor);

        expect(acceptorBalance.toString()).to.equal(tokenAmount);

        expectEvent(receipt, "TokenWithdrawl", {
            receiver: receiver,
            acceptor: acceptor,
            amount: tokenAmount,
            token: this.token.address,
        });
    });
});
