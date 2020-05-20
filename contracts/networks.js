require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const projectId = process.env.INFURA_ID;
const mnemonic = process.env.ROPSTEN_MNEMONIC;

 module.exports = {
   networks: {

    ropsten: {
      provider: () => new HDWalletProvider(
        mnemonic, `https://ropsten.infura.io/v3/${projectId}`
      ),
      networkId: 3,
      gasPrice: 10e9,
      gas: 5e6,
    }
   },
 };