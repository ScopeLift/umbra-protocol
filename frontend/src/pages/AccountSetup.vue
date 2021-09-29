<template>
  <q-page padding>
    <h2 class="page-title">Setup</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">Connect your wallet to setup your account</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" label="Connect Wallet" />
        </connect-wallet>
      </div>
    </div>

    <div v-else-if="!isAccountSetup" class="form-max-wide shadow-2" :class="$q.screen.xs ? 'q-pa-lg' : 'q-pa-xl'">
      <h5 class="q-my-md q-pt-none">Generate and Publish Stealth Keys</h5>
      <div class="q-mt-md">
        Use the button below to complete the setup process. This will result in two prompts from your wallet:
        <ol>
          <li>
            <span class="text-bold">Sign a message</span> used to generate your Umbra-specific pair of private keys.
            These keys allow you to securely use Umbra without compromising the private keys of your connected wallet.
            You do not need to save these keys anywhere!
          </li>
          <li>
            <span class="text-bold">Submit a transaction</span> to save the corresponding public keys on-chain, so
            anyone can use them to send you stealth payments.
          </li>
        </ol>
      </div>
      <base-button
        @click="setupAccount"
        :disable="isLoading"
        :loading="isLoading"
        :fullWidth="$q.screen.xs"
        label="Setup account"
      />
    </div>

    <div v-else class="form-max-wide shadow-2" :class="$q.screen.xs ? 'q-pa-lg' : 'q-pa-xl'">
      <h5 class="q-my-md q-pt-none"><q-icon color="positive" class="q-mr-sm" name="fas fa-check" />Setup Complete!</h5>
      <p class="q-mt-md">
        You may now return
        <router-link class="hyperlink" :to="{ name: 'home' }">home</router-link> to send or receive funds.
      </p>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import ConnectWallet from 'components/ConnectWallet.vue';
import { Provider } from 'components/models';
import useWalletStore from 'src/store/wallet';
import { txNotify } from 'src/utils/alerts';

function useKeys() {
  const { getPrivateKeys, isAccountSetup, setIsAccountSetup, signer, spendingKeyPair, stealthKeyRegistry, userAddress, viewingKeyPair } = useWalletStore(); // prettier-ignore
  const isLoading = ref(false);

  async function setupAccount() {
    try {
      if (!stealthKeyRegistry.value) return; // should always be defined when this method called, this is just for TS inference

      // Prompt user for signature to generate keys
      isLoading.value = true;
      const status = await getPrivateKeys();

      if (status !== 'success') {
        // Most likely user rejected the signature
        isLoading.value = false;
        return;
      }

      // Sanity check that keys are available to guarantee we don't bad/empty public keys
      const hasKeys = spendingKeyPair.value?.privateKeyHex && viewingKeyPair.value?.privateKeyHex;
      if (!hasKeys) throw new Error('Umbra-specific keys have not been generated');

      // Save public keys to the StealthKeyRegistry
      const spendingPubKey = String(spendingKeyPair.value?.publicKeyHex);
      const viewingPubKey = String(viewingKeyPair.value?.publicKeyHex);
      const tx = await stealthKeyRegistry.value?.setStealthKeys(spendingPubKey, viewingPubKey, signer?.value);
      void txNotify(tx.hash, signer.value?.provider as Provider);
      await tx.wait();
      setIsAccountSetup(true);
      isLoading.value = false;
    } catch (e) {
      isLoading.value = false;
      throw e;
    }
  }

  return { isAccountSetup, isLoading, setupAccount, userAddress };
}

export default defineComponent({
  name: 'PageSetup',
  components: { ConnectWallet },
  setup() {
    return { ...useKeys() };
  },
});
</script>

<style lang="sass" scoped>
.no-ptr
  cursor: auto // disable cursor pointer the icons have by default
  pointer-events: none // disable hover effect the icons have by default
</style>
