import '@nomiclabs/hardhat-ethers';
import { expect } from 'chai';

/**
 * @notice Wrapper function to verify that an async function rejects with the specified message
 * @param promise Promise to wait for
 * @param message Expected rejection message
 */
export const expectRejection = async (promise: Promise<any>, message: string) => {
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
