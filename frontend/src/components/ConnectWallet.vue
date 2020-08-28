<template>
  <div>
    <q-btn color="primary" label="Connect wallet" @click="connectWallet" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Dark } from 'quasar';
import useWalletStore from 'src/store/wallet';
import Onboard from 'bnc-onboard';

function useWallet() {
  const { setProvider } = useWalletStore();

  async function connectWallet() {
    const rpcUrl = `https://mainnet.infura.io/v3/${String(process.env.INFURA_ID)}`;

    const wallets = [
      { walletName: 'metamask', preferred: true },
      { walletName: 'coinbase', preferred: true },
      { walletName: 'torus', preferred: true },
      {
        walletName: 'ledger',
        rpcUrl,
      },
      {
        walletName: 'trezor',
        appUrl: 'https://cancel-ethereum-transactions.web.app/',
        email: 'matt@mattsolomon.dev',
        rpcUrl,
      },
      {
        walletName: 'fortmatic',
        apiKey: process.env.FORTMATIC_API_KEY,
        preferred: true,
      },
      {
        walletName: 'portis',
        apiKey: process.env.PORTIS_API_KEY,
      },
      { walletName: 'authereum' },
      {
        walletName: 'walletConnect',
        infuraKey: process.env.INFURA_ID,
        preferred: true,
      },
      { walletName: 'trust', rpcUrl },
      { walletName: 'dapper' },
      { walletName: 'walletLink', rpcUrl, label: 'Coinbase Wallet (WalletLink)' },
      { walletName: 'opera' },
      { walletName: 'operaTouch' },
      { walletName: 'status' },
      { walletName: 'unilogin' },
      { walletName: 'imToken', rpcUrl },
      { walletName: 'meetone' },
      {
        walletName: 'mykey',
        rpcUrl,
      },
      {
        walletName: 'huobiwallet',
        rpcUrl,
      },
    ];

    const onboard = Onboard({
      dappId: process.env.BLOCKNATIVE_API_KEY,
      darkMode: Dark.isActive,
      networkId: 3, // always Ropsten
      walletSelect: {
        wallets: wallets,
      },
      subscriptions: {
        wallet: async (wallet) => {
          await setProvider(wallet.provider);
        },
      },
    });
    await onboard.walletSelect();
    await onboard.walletCheck();
  }

  return { connectWallet };
}

export default defineComponent({
  name: 'ConnectWallet',

  setup() {
    return { ...useWallet() };
  },
});
</script>
