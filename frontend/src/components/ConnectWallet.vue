<template>
  <div @click="connectWallet">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, SetupContext } from '@vue/composition-api';
import useWalletStore from 'src/store/wallet';

function useWallet(context: SetupContext, to: string) {
  const { onboard, configureProvider, userAddress } = useWalletStore();

  async function connectWallet() {
    // If user already connected wallet, continue (this branch is used when clicking e.g. the "Send" box
    // from the home page)
    if (userAddress.value && to) {
      await context.root.$router.push({ name: to });
      return;
    }

    // Clear existing wallet selection
    onboard.value?.walletReset();

    // Connect wallet
    await onboard.value?.walletSelect();
    await onboard.value?.walletCheck();

    // Finish setup
    await configureProvider(); // get ENS name, CNS names, etc.
    if (to) await context.root.$router.push({ name: to }); // redirect to specified page
  }

  return { connectWallet };
}

export default defineComponent({
  name: 'ConnectWallet',

  props: {
    // Page name to redirect to after logging in
    to: {
      type: String,
      required: false,
      default: undefined,
    },
  },

  setup(props, context) {
    return { ...useWallet(context, props.to) };
  },
});
</script>
