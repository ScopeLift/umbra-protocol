<template>
  <div @click="connectWalletWithRedirect">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, SetupContext } from 'vue';
import { useRouter } from 'vue-router';
import useWalletStore from 'src/store/wallet';

const router = useRouter();


function useWallet(_context: SetupContext, to: string) {
  const { connectWallet, userAddress } = useWalletStore();
  // async function connectWalletWithRedirect() {
    const connectWalletWithRedirect = async () => {
    // If user already connected wallet, continue (this branch is used when clicking e.g. the "Send" box
    // from the home page)
    if (userAddress.value && to) {
      await router.push({ name: to });
      return;
    }

    await connectWallet();

    if (to) await router.push({ name: to }); // redirect to specified page
  }

  return { connectWalletWithRedirect };
}

export default defineComponent({
  name: 'ConnectWallet',

  props: {
    // Page name to redirect to after logging in
    to: {
      type: String,
      required: false,
      default: '', // used to be undefined
    },
  },

  setup(props, context) {
    return { ...useWallet(context, props.to) };
  },
});
</script>
