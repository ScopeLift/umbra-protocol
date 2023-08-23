<template>
  <div @click="connectWalletWithRedirect">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Router, useRouter } from 'vue-router';
import useWalletStore from 'src/store/wallet';
import { paramsToObject } from 'src/utils/utils';

function useWallet(to: string, router: Router, params?: string) {
  const { connectWallet, userAddress } = useWalletStore();

  async function connectWalletWithRedirect() {
    // If user already connected wallet, continue (this branch is used when clicking e.g. the "Send" box
    // from the home page)
    const parsedParams = paramsToObject(new URLSearchParams(params || '').entries());
    if (userAddress.value && to) {
      console.log(params);
      console.log(router);
      console.log(to);
      console.log(parsedParams);
      await router.push({ name: to, query: parsedParams });
      return;
    } else if (userAddress.value) {
      return;
    }

    await connectWallet();

    // if (to) await router.push({ name: to, query: parsedParams }); // redirect to specified page
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
    console.log('SETUP');
    console.log(props.to);
    return { ...useWallet(props.to || location.pathname.replace('/', ''), router, props.params) };
  },
});
</script>
