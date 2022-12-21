<template>
  <q-page padding>
    <h2 class="page-title">{{ $t('Setup.setup') }}</h2>

    <!-- User has not connected wallet  -->
    <div v-if="!userAddress">
      <p class="text-center">{{ $t('Setup.connect-wallet') }}</p>
      <div class="row justify-center">
        <connect-wallet>
          <base-button class="text-center" label="Connect Wallet" />
        </connect-wallet>
      </div>
    </div>

    <div
      v-else-if="!isSetupComplete && (!isAccountSetup || keysMatch === false)"
      class="form-max-wide shadow-2"
      :class="$q.screen.xs ? 'q-pa-lg' : 'q-pa-xl'"
    >
      <h5 class="q-my-md q-pt-none">{{ $t('Setup.generate-stealth') }}</h5>
      <div class="q-mt-md" v-html="$t('Setup.paragraph')"></div>
      <base-button
        @click="setupAccount"
        :disable="isLoading"
        :loading="isLoading"
        :fullWidth="$q.screen.xs"
        :label="$t('Setup.setup-account')"
      />
    </div>

    <div v-else class="form-max-wide shadow-2" :class="$q.screen.xs ? 'q-pa-lg' : 'q-pa-xl'">
      <h5 class="q-my-md q-pt-none">
        <q-icon color="positive" class="q-mr-sm" name="fas fa-check" />{{ $t('Setup.complete') }}
      </h5>
      <i18n-t keypath="Setup.return-to-home" tag="p" class="q-mt-md">
        <router-link class="hyperlink" :to="{ name: 'home' }">{{ $t('Setup.return-home') }}</router-link>
      </i18n-t>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ConnectWallet from 'components/ConnectWallet.vue';
import { Provider } from 'components/models';
import useWalletStore from 'src/store/wallet';
import { txNotify } from 'src/utils/alerts';

function useKeys() {
  const {
    getPrivateKeys,
    isAccountSetup,
    keysMatch,
    setIsAccountSetup,
    syncStealthKeys,
    signer,
    spendingKeyPair,
    stealthKeyRegistry,
    userAddress,
    viewingKeyPair,
  } = useWalletStore();
  const isLoading = ref(false);
  const isSetupComplete = ref(false);

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
      syncStealthKeys(); // update store with new keys
      isSetupComplete.value = true;
      isLoading.value = false;
    } catch (e) {
      isLoading.value = false;
      throw e;
    }
  }

  return { isAccountSetup, isSetupComplete, isLoading, keysMatch, setupAccount, userAddress };
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
