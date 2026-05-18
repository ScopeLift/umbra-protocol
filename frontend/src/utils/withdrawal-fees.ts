import { ref, Ref } from 'vue';
import { FeeEstimate, TokenInfoExtended } from 'components/models';
import { UmbraApi } from 'src/utils/umbra-api';

type FeeRelayer = Pick<UmbraApi, 'getFeeEstimate'>;

type WithdrawalFeesConfig = {
  nativeToken: Ref<TokenInfoExtended>;
  relayer: Ref<FeeRelayer | undefined>;
  isNativeToken: (tokenAddress: string) => boolean;
};

export function nativeFeeEstimate(nativeToken: TokenInfoExtended): FeeEstimate {
  return {
    umbraApiVersion: { major: 0, minor: 0, patch: 0 },
    fee: '0',
    token: nativeToken,
  };
}

export function useWithdrawalFees({ nativeToken, relayer, isNativeToken }: WithdrawalFeesConfig) {
  const activeFee = ref<FeeEstimate>();
  const activeWithdrawalFee = ref<FeeEstimate>();
  const isFeeLoading = ref(false);
  let feeRequestId = 0;

  const fetchFeeEstimate = async (tokenAddress: string) => {
    if (isNativeToken(tokenAddress)) return nativeFeeEstimate(nativeToken.value);
    return relayer.value?.getFeeEstimate(tokenAddress);
  };

  const loadFeeEstimate = async (tokenAddress: string, setWithdrawalFee: boolean) => {
    const requestId = ++feeRequestId;
    const tokenIsNative = isNativeToken(tokenAddress);
    if (!tokenIsNative) isFeeLoading.value = true;

    try {
      const feeEstimate = await fetchFeeEstimate(tokenAddress);
      if (setWithdrawalFee) activeWithdrawalFee.value = feeEstimate;
      if (feeEstimate && requestId === feeRequestId) activeFee.value = feeEstimate;
      return feeEstimate;
    } finally {
      if (!tokenIsNative && requestId === feeRequestId) isFeeLoading.value = false;
    }
  };

  const getFeeEstimate = (tokenAddress: string) => loadFeeEstimate(tokenAddress, false);
  const getWithdrawalFeeEstimate = (tokenAddress: string) => loadFeeEstimate(tokenAddress, true);
  const clearActiveWithdrawalFee = () => {
    activeWithdrawalFee.value = undefined;
  };

  return {
    activeFee,
    activeWithdrawalFee,
    clearActiveWithdrawalFee,
    getFeeEstimate,
    getWithdrawalFeeEstimate,
    isFeeLoading,
  };
}
