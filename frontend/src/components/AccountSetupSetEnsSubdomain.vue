<template>
  <base-input
    v-model="ensSubdomain"
    @click="emitSubdomain"
    :appendButtonDisable="!ensSubdomain"
    appendButtonLabel="Continue"
    :hideBottomSpace="true"
    :lazy-rules="false"
    :rules="isValidSubdomain"
    suffix=".umbra.eth"
    style="max-width: 400px"
  />
</template>

<script lang="ts">
import { computed, defineComponent, ref, SetupContext } from '@vue/composition-api';
import useWalletStore from 'src/store/wallet';
import { isSubdomainAvailable, rootName } from 'src/utils/ens';
import { Provider } from 'components/models';

function useSubdomainRegistration(context: SetupContext) {
  const { signer } = useWalletStore();
  const provider = computed(() => signer.value?.provider as Provider);
  const ensSubdomain = ref<string>();

  // For form validation
  async function isValidSubdomain(val: string) {
    // Don't show error string if form is empty
    if (!ensSubdomain.value) return true;

    // Only allow one subdomain, e.g. matt.solomon.umbra.eth has 4 parts when spliy by the dot so is disallowed
    const fullName = `${val}.${rootName}`;
    if (fullName.split('.').length > 3) return 'Please enter a valid name without any periods';

    // Check availability
    const isAvailable = await isSubdomainAvailable(val, provider.value);
    return isAvailable || `${fullName} is already registered`;
  }

  // For passing the selected, available subdomain to AccountSetup.vue. This does nothing if no subdomain is entered,
  // of if the entered subdomain is not available
  async function emitSubdomain() {
    if (!ensSubdomain.value) return;
    const isAvailable = true === (await isValidSubdomain(ensSubdomain.value)); // need to check for explicit true value
    if (isAvailable) context.emit('subdomain-selected', { name: `${ensSubdomain.value}.${rootName}` });
  }

  return { ensSubdomain, isValidSubdomain, emitSubdomain };
}

export default defineComponent({
  name: 'AccountSetupSetEnsSubdomain',
  setup(_props, context) {
    return { ...useSubdomainRegistration(context) };
  },
});
</script>
