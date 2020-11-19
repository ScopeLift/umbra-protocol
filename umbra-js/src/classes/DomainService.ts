/**
 * @dev Wraps ENS and CNS into a common interface
 */

import { Resolution } from '@unstoppabledomains/resolution';
import { ExternalProvider } from '../types';
const cns = require('../utils/cns');
const ens = require('../utils/ens');

export class DomainService {
  /**
   * @param provider web3 provider to use (not an ethers provider)
   * @param udResolution Resolution instance of @unstoppabledomains/resolution
   */
  constructor(readonly provider: ExternalProvider, readonly udResolution: Resolution) {}

  /**
   * @notice Computes namehash of the input domain, normalized to ENS or CNS compatibility
   * @param name domain, e.g. myname.eth
   */
  namehash(name: string) {
    if (isEnsDomain(name)) {
      return ens.namehash(name);
    } else {
      return cns.namehash(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, return the associated umbra signature or return
   * undefined if none exists
   * @param name domain, e.g. myname.eth
   */
  async getSignature(name: string) {
    if (isEnsDomain(name)) {
      return await ens.getSignature(name, this.provider);
    } else {
      return await cns.getSignature(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, recovers and returns the public key from its signature
   * @param name domain, e.g. myname.eth
   */
  async getPublicKey(name: string) {
    if (isEnsDomain(name)) {
      return await ens.getPublicKey(name, this.provider);
    } else {
      return await cns.getPublicKey(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, sets the associated umbra signature
   * @param name domain, e.g. myname.eth
   * @param signature user's signature of the Umbra protocol message
   * @returns Transaction hash
   */
  async setSignature(name: string, signature: string) {
    if (isEnsDomain(name)) {
      return await ens.setSignature(name, this.provider, signature);
    } else {
      return await cns.setSignature(name, this.provider, this.udResolution, signature);
    }
  }
}

function isEnsDomain(domainName: string) {
  return domainName.endsWith('.eth');
}
