const cns = require('../utils/cns');
const ens = require('../utils/ens');

const addresses = require('../addresses.json');

class DomainService {
  /**
   * @param {*} provider raw web3 provider to use (not an ethers instance)
   * @param {*} resolution Resolution instance of @unstoppabledomains/resolution
   */
  constructor(provider, resolution) {
    this.provider = provider;
    this.udResolution = resolution;
  }

  /**
   * @notice Computes namehash of the input domain, normalized to ENS or CNS compatibility
   * @param {String} name domain, e.g. myname.eth
   */
  namehash(name) {
    if (isEnsDomain(name)) {
      return ens.namehash(name);
    } else {
      return cns.namehash(name);
    }
  }

  /**
   * @notice For a given domain, return the associated umbra signature or return
   * undefined if none exists
   * @param {String} name domain, e.g. myname.eth
   */
  async getSignature(name) {
    if (isEnsDomain(name)) {
      return await ens.getSignature(name, this.provider);
    } else {
      return await cns.getSignature(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, recovers and returns the public key from its signature
   * @param {String} name domain, e.g. myname.eth
   */
  async getPublicKey(name) {
    if (isEnsDomain(name)) {
      return await ens.getPublicKey(name, this.provider);
    } else {
      return await cns.getPublicKey(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, sets the associated umbra signature
   * @param {String} name domain, e.g. myname.eth
   * @param {String} signature user's signature of the Umbra protocol message
   * @returns {String} Transaction hash
   */
  async setSignature(name, signature) {
    if (isEnsDomain(name)) {
      return await ens.setSignature(name, this.provider, signature);
    } else {
      return await cns.setSignature(name, this.provider, this.udResolution, signature);
    }
  }
}

function isEnsDomain(domainName) {
  return domainName.endsWith('.eth');
}

module.exports = DomainService;
