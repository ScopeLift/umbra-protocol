import { Umbra } from '../src/classes/Umbra';
import { BigNumberish, ethers } from 'ethers';
import * as chai from 'chai';
import { accounts, contract, provider } from '@openzeppelin/test-environment';
import type { ExternalProvider } from '../src/types';
import { TestToken as ERC20 } from '../types/contracts/TestToken';

const TestToken = contract.fromArtifact('TestToken');
const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;
const INFURA_ID = process.env.INFURA_ID;
const JSON_RPC_URL = `https://ropsten.infura.io/v3/${INFURA_ID}`;

const [sender, receiver] = accounts;
const quantity = ethers.utils.parseEther('100');

const mint = async (token: ERC20, to: string, amount: BigNumberish) => await token.mint(to, amount);

/**
 * @notice Wrapper function to verify that an async function rejects with the specified message
 * @param promise Promise to wait for
 * @param message Expected rejection message
 */
const expectRejection = async (promise: Promise<any>, message: string) => {
  // Error type requires strings, so we set them to an arbitrary value and
  // later check the values. If unchanged, the promise did not reject
  let error: Error = { name: 'default', message: 'default' };
  try {
    await promise;
  } catch (e) {
    error = e;
  } finally {
    expect(error.name).to.not.equal('default');
    expect(error.message).to.not.equal('default');
    expect(error.message).to.equal(message);
  }
};

describe.only('Umbra class', () => {
  let dai: ERC20;
  let umbra: Umbra;
  let umbraReadonly: Umbra;

  beforeEach(async () => {
    // Get signers
    const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
    const signerSender = ethersProvider.getSigner(1);
    // const signerReceiver = ethersProvider.getSigner(2);

    // Get Umbra instances
    umbra = await Umbra.create(signerSender);
    umbraReadonly = await Umbra.createReadonly(JSON_RPC_URL);

    // Deploy mock tokens
    dai = (await TestToken.new('Dai', 'DAI')) as ERC20;
  });

  describe('Initialization', () => {
    it('initializes correctly when using a web3 provider', async () => {
      expect(umbra.provider._isProvider).to.be.true;
      expect(Boolean(umbra.signer)).to.be.true;
    });

    it('initializes correctly when using a JSON-RPC provider', async () => {
      expect(umbraReadonly.provider._isProvider).to.be.true;
      expect(Boolean(umbraReadonly.signer)).to.be.false;
    });
  });

  describe('Sends funds', () => {
    it.only('reverts if sender does not have enough funds', async () => {
      const msg = `Insufficient balance to complete transfer. Has 0 tokens, tried to send ${quantity.toString()} tokens.`;
      await expectRejection(umbra.send(dai.address, quantity, receiver), msg);
    });

    it('sends tokens without payload extension', async () => {
      await mint(dai, sender, quantity);
      const tx = await umbra.send(dai.address, quantity, receiver);
      console.log(tx);
    });

    it('sends tokens with payload extension', async () => {
      //
    });

    it('sends ETH without payload extension', async () => {
      //
    });

    it('sends ETH with payload extension', async () => {
      //
    });
  });
});
