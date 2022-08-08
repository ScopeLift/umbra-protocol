/**
 * @notice This store is used to facilitate the communication the status of operations between
 * components to avoid a clunk and complex setup using props. Right now this store is only used
 * for determining whether the "Withdraw" input/button in WithdrawForm.vue button should be disabled
 */
import { computed, ref } from 'vue';

const isInWithdrawFlow = ref(false);

export default function useStatusStore() {
  function setIsInWithdrawFlow(status: boolean) {
    isInWithdrawFlow.value = status;
  }

  return {
    setIsInWithdrawFlow,
    isInWithdrawFlow: computed(() => isInWithdrawFlow.value),
  };
}
