/**
 * @dev Wraps ENS and CNS into a common interface
 */

import { default as Resolution, Eip1993Factories } from '@unstoppabledomains/resolution';
import { EthersProvider } from '../types';
import * as cns from '../utils/cns';
import * as ens from '../utils/ens';
import * as constants from '../constants.json';

const { CNS_REGISTRY } = constants;

export class DomainService {
  // Resolution instance of @unstoppabledomains/resolution
  readonly udResolution: Resolution;

  /**
   * @param provider ethers provider instance
   */
  constructor(readonly provider: EthersProvider) {
    this.udResolution = new Resolution({
      blockchain: {
        cns: {
          provider: Eip1993Factories.fromEthersProvider(provider),
          registry: CNS_REGISTRY,
        },
      },
    });
  }

  /**
   * @notice Computes namehash of the input domain, normalized to ENS or CNS compatibility
   * @param name domain, e.g. myname.eth
   */
  namehash(name: string) {
    if (ens.isEnsDomain(name)) {
      return ens.namehash(name);
    } else {
      return cns.namehash(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, recovers and returns the public key from its signature
   * @param name domain, e.g. myname.eth
   */
  async getPublicKeys(name: string) {
    if (ens.isEnsDomain(name)) {
      return ens.getPublicKeys(name, this.provider);
    } else {
      return cns.getPublicKeys(name, this.udResolution);
    }
  }

  /**
   * @notice For a given domain, sets the associated umbra signature
   * @param name domain, e.g. myname.eth
   * @param signature user's signature of the Umbra protocol message
   * @returns Transaction hash
   */
  async setPublicKeys(name: string, spendingPrivateKey: string, viewingPrivateKey: string) {
    if (ens.isEnsDomain(name)) {
      return ens.setPublicKeys(name, spendingPrivateKey, viewingPrivateKey, this.provider);
    } else {
      return cns.setPublicKeys(name, this.provider, this.udResolution, spendingPrivateKey);
    }
  }
}
