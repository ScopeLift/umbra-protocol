<template>
  <div @click="connectWallet">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, SetupContext } from '@vue/composition-api';
import { Dark } from 'quasar';
import useWalletStore from 'src/store/wallet';
import Onboard from 'bnc-onboard';

function useWallet(context: SetupContext, to: string) {
  const { setProvider, userAddress } = useWalletStore();

  async function connectWallet() {
    // If user already connected wallet, continue
    if (userAddress.value) {
      await context.root.$router.push({ name: to });
      return;
    }

    // Otherwise, prompt them for connection
    const rpcUrl = `https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`;
    const wallets = [
      { walletName: 'metamask', preferred: true },
      { walletName: 'coinbase', preferred: true },
      { walletName: 'torus', preferred: true },
      { walletName: 'ledger', rpcUrl },
      { walletName: 'trezor', appUrl: 'https://umbra.cash/', email: 'matt@scopelift.co', rpcUrl },
      { walletName: 'fortmatic', apiKey: process.env.FORTMATIC_API_KEY, preferred: true },
      { walletName: 'portis', apiKey: process.env.PORTIS_API_KEY },
      { walletName: 'authereum' },
      { walletName: 'walletConnect', infuraKey: process.env.INFURA_ID, preferred: true },
      { walletName: 'trust', rpcUrl },
      { walletName: 'walletLink', rpcUrl, label: 'Coinbase Wallet (WalletLink)' },
      { walletName: 'opera' },
      { walletName: 'operaTouch' },
      { walletName: 'status' },
      { walletName: 'imToken', rpcUrl },
      { walletName: 'meetone' },
      { walletName: 'mykey', rpcUrl },
      { walletName: 'huobiwallet', rpcUrl },
    ];

    const onboard = Onboard({
      dappId: process.env.BLOCKNATIVE_API_KEY,
      darkMode: Dark.isActive,
      networkId: 4, // always testnet for now
      walletSelect: { wallets },
      subscriptions: {
        wallet: async (wallet) => {
          await setProvider(wallet.provider);
        },
      },
    });
    await onboard.walletSelect();
    await onboard.walletCheck();

    // Redirect to specified page
    await context.root.$router.push({ name: to });
  }

  return { connectWallet };
}

export default defineComponent({
  name: 'ConnectWallet',

  props: {
    // Page name to redirect to after logging in
    to: {
      type: String,
      required: true,
    },
  },

  setup(props, context) {
    return { ...useWallet(context, props.to) };
  },
});
</script>
