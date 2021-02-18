require('dotenv').config();

module.exports = {
  node: {
    fork: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
    account_keys_path: './test-keys.json',
  },
};
