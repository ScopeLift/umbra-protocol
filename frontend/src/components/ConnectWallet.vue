<template>
  <div @click="connectWalletWithRedirect">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Router, useRouter, useRoute } from 'vue-router';
import useWalletStore from 'src/store/wallet';
import { paramsToObject } from 'src/utils/utils';

function useWallet(router: Router, to?: string, params?: string) {
  const { connectWallet, userAddress } = useWalletStore();

  async function connectWalletWithRedirect() {
    // If user already connected wallet, continue (this branch is used when clicking e.g. the "Send" box
    // from the home page)
    const route = useRoute();
    const parsedParams = paramsToObject(new URLSearchParams(params || '').entries());
    if (userAddress.value && to) {
      await router.push({ name: to, query: parsedParams });
      return;
    } else if (userAddress.value) {
      return;
    }

    await connectWallet();

    if (to) await router.push({ name: to || route.path, query: parsedParams }); // redirect to specified page
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
      default: undefined,
    },
    params: {
      type: String,
      required: false,
      default: undefined,
    },
  },

  setup(props) {
    const router = useRouter();
    return { ...useWallet(router, props.to, props.params) };
  },
});
</script>
