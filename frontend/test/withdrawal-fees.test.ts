import { ref } from 'vue';
import { FeeEstimate, TokenInfoExtended } from 'src/components/models';
import { useWithdrawalFees } from 'src/utils/withdrawal-fees';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const token: TokenInfoExtended = {
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: 1,
  decimals: 18,
  logoURI: 'dai.svg',
  minSendAmount: '0',
  name: 'Dai Stablecoin',
  symbol: 'DAI',
};

const nativeToken: TokenInfoExtended = {
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  chainId: 1,
  decimals: 18,
  logoURI: 'eth.svg',
  minSendAmount: '0',
  name: 'Ether',
  symbol: 'ETH',
};

const rowFee: FeeEstimate = {
  fee: '100',
  sponsorAddress: '0x0000000000000000000000000000000000000001',
  token,
  umbraApiVersion: { major: 1, minor: 0, patch: 0 },
};

const withdrawalFee: FeeEstimate = {
  fee: '200',
  sponsorAddress: '0x0000000000000000000000000000000000000002',
  token,
  umbraApiVersion: { major: 1, minor: 0, patch: 0 },
};

describe('useWithdrawalFees', () => {
  it('keeps the withdrawal fee when an earlier row estimate resolves later', async () => {
    const firstResponse = createDeferred<FeeEstimate>();
    const secondResponse = createDeferred<FeeEstimate>();
    const getFeeEstimate = jest
      .fn()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);

    const withdrawalFees = useWithdrawalFees({
      nativeToken: ref(nativeToken),
      relayer: ref({ getFeeEstimate }),
      isNativeToken: (tokenAddress: string) => tokenAddress === nativeToken.address,
    });

    const rowEstimate = withdrawalFees.getFeeEstimate(token.address);
    const withdrawalEstimate = withdrawalFees.getWithdrawalFeeEstimate(token.address);

    secondResponse.resolve(withdrawalFee);
    await expect(withdrawalEstimate).resolves.toEqual(withdrawalFee);
    expect(withdrawalFees.activeWithdrawalFee.value).toEqual(withdrawalFee);
    expect(withdrawalFees.activeFee.value).toEqual(withdrawalFee);

    firstResponse.resolve(rowFee);
    await expect(rowEstimate).resolves.toEqual(rowFee);
    expect(withdrawalFees.activeWithdrawalFee.value).toEqual(withdrawalFee);
    expect(withdrawalFees.activeFee.value).toEqual(withdrawalFee);
  });
});
