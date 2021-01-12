require('dotenv').config();

module.exports = {
  node: {
    fork: `https://ropsten.infura.io/v3/${process.env.INFURA_ID}`,
    account_keys_path: './test-keys.json',
  },
};
