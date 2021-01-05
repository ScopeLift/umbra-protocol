import { Umbra } from '../src/classes/Umbra';
import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import type { ExternalProvider } from '../src/types';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const INFURA_ID = process.env.INFURA_ID;
const JSON_RPC_URL = `https://ropsten.infura.io/v3/${INFURA_ID}`;

const createUmbraInstance = async () => await Umbra.create(web3Provider);
const createReadonlyUmbraInstance = async () => await Umbra.createReadonly(JSON_RPC_URL);

describe.only('Umbra class', () => {
  describe('Initialization', () => {
    it('initializes correctly when using a web3 provider', async () => {
      const umbra = await createUmbraInstance();
      expect(umbra.provider._isProvider).to.be.true;
      expect(umbra.signer._isSigner).to.be.true;
    });

    it('initializes correctly when using a JSON-RPC provider', async () => {
      const umbra = await createReadonlyUmbraInstance();
      expect(umbra.provider._isProvider).to.be.true;
      expect(umbra.signer._isSigner).to.be.true;
    });
  });
});
