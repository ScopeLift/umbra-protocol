/**
 * @jest-environment jsdom
 */
jest.mock('src/store/settings', () => () => ({
  getUmbraApiVersion: jest.fn(() => null),
  setUmbraApiVersion: jest.fn(),
  clearUmbraApiVersion: jest.fn(),
}));

jest.mock('src/utils/utils', () => ({
  jsonFetch: jest.fn(),
}));

import { UmbraApi } from '../src/utils/umbra-api';

const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const relayTransactionHash = `0x${'11'.repeat(32)}`;
const umbraApiVersion = { major: 2, minor: 0, patch: 3 };
const withdrawalInputs = {
  stealthAddr: '0x2436012a54c81f2F03e6E3D83090f3F5967bF1B5',
  acceptor: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  signature: `0x${'22'.repeat(65)}`,
  sponsorFee: '1000',
};

function mockResponse(data: unknown) {
  return Promise.resolve({
    json: () => Promise.resolve(data),
  } as Response);
}

describe('UmbraApi', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    global.fetch = fetchMock as unknown as typeof fetch;
    UmbraApi.baseUrl = 'https://api.test';
    UmbraApi.relayStatusPollingIntervalMs = 0;
    UmbraApi.relayStatusPollingTimeoutMs = 1000;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an included relay transaction hash without polling', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ umbraApiVersion, relayTransactionHash }));
    const api = new UmbraApi([], 1, undefined);

    await expect(api.relayWithdraw(tokenAddress, withdrawalInputs)).resolves.toEqual({
      umbraApiVersion,
      relayTransactionHash,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`https://api.test/tokens/${tokenAddress}/relay?chainId=1`, {
      method: 'POST',
      body: JSON.stringify(withdrawalInputs),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('polls a Turnkey transaction status until the final hash is available', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ umbraApiVersion, sendTransactionStatusId: 'status-id' }))
      .mockResolvedValueOnce(mockResponse({ umbraApiVersion, status: 'BROADCASTING' }))
      .mockResolvedValueOnce(mockResponse({ umbraApiVersion, status: 'INCLUDED', relayTransactionHash }));
    const api = new UmbraApi([], 1, undefined);

    await expect(api.relayWithdraw(tokenAddress, withdrawalInputs)).resolves.toEqual({
      umbraApiVersion,
      relayTransactionHash,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `https://api.test/tokens/${tokenAddress}/relay/status-id?chainId=1`);
    expect(fetchMock).toHaveBeenNthCalledWith(3, `https://api.test/tokens/${tokenAddress}/relay/status-id?chainId=1`);
  });

  it('throws when Turnkey reports a failed transaction status', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ umbraApiVersion, sendTransactionStatusId: 'status-id' }))
      .mockResolvedValueOnce(mockResponse({ umbraApiVersion, status: 'FAILED', errorMessage: 'simulation reverted' }));
    const api = new UmbraApi([], 1, undefined);

    await expect(api.relayWithdraw(tokenAddress, withdrawalInputs)).rejects.toThrow(
      'Could not relay withdraw: Turnkey status FAILED: simulation reverted'
    );
  });
});
