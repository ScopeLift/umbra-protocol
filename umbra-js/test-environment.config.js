require('dotenv').config();

module.exports = {
  node: {
    fork: `https://ropsten.infura.io/v3/${process.env.INFURA_ID}`,
  },
};
