import { Umbra } from '../src/classes/Umbra';
import * as chai from 'chai';
import { provider } from '@openzeppelin/test-environment';
import type { ExternalProvider } from '../src/types';

const { expect } = chai;
const web3Provider = (provider as unknown) as ExternalProvider;

describe.only('Umbra class', () => {
  let umbra: Umbra;

  beforeEach(async () => {
    umbra = await Umbra.create(web3Provider);
    expect(true).to.be.true;
  });

  it('initializes correctly', () => {
    console.log(umbra);
  });
});
