<template>
  <q-layout view="hHh Lpr fFf">
    <q-header class="q-mx-md q-mt-md" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="column all-content-format">
        <!-- Main header -->
        <div>
          <div class="row justify-between items-center no-wrap all-content-format">
            <div class="col-auto">
              <!-- LOGO AND TITLE -->
              <div
                class="row justify-start items-center"
                style="cursor: pointer"
                @click="$router.push({ name: 'home' })"
              >
                <img
                  alt="Umbra logo"
                  class="q-ml-md"
                  src="~assets/app-logo-128x128.png"
                  style="max-width: 50px"
                />
                <div class="text-h5 dark-toggle">
                  <span class="primary header-black q-ml-md">Umbra</span>
                </div>
              </div>
            </div>
            <!-- ADDRESS AND SETTINGS AND SETTINGS -->
            <div class="col-auto q-mr-md">
              <div v-if="userAddress" class="text-caption dark-toggle">
                Address: {{ userAddress }}
              </div>
              <div class="row justify-end items-center q-mt-xs">
                <div v-if="userAddress && network !== 'ropsten'" class="negative text-bold q-mr-md">
                  You must be on the Ropsten network to use this app
                </div>
                <q-icon
                  v-if="!$q.dark.isActive"
                  class="col-auto dark-toggle"
                  name="fas fa-moon"
                  style="cursor: pointer"
                  @click="toggleDarkMode()"
                />
                <q-icon
                  v-else
                  class="col-auto dark-toggle"
                  name="fas fa-sun"
                  style="cursor: pointer"
                  @click="toggleDarkMode()"
                />
                <connect-wallet v-if="!userAddress" class="q-ml-lg" />
              </div>
            </div>
          </div>
        </div>
        <!-- Alpha warning -->
        <div
          id="alpha"
          class="dark-toggle text-center q-mt-lg"
          style="max-width: 600px; margin: 1rem auto"
        >
          WARNING: This is alpha software and is only available on Ropsten
        </div>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watchEffect } from '@vue/composition-api';
import { Dark, LocalStorage } from 'quasar';
import useWalletStore from 'src/store/wallet';
import ConnectWallet from 'components/ConnectWallet';

function useDarkMode() {
  function toggleDarkMode() {
    Dark.set(!Dark.isActive);
    LocalStorage.set('is-dark', Dark.isActive);
  }

  const mounted = onMounted(function () {
    Dark.set(Boolean(LocalStorage.getItem('is-dark')));
  });

  return { toggleDarkMode, mounted };
}

function useWallet() {
  const { userAddress, provider } = useWalletStore();
  const network = ref('');

  watchEffect(async () => {
    if (provider.value) {
      network.value = (await provider.value.getNetwork()).name;
    }
  });

  return { userAddress, network };
}

export default defineComponent({
  name: 'BaseLayout',
  components: { ConnectWallet },
  setup() {
    return { ...useDarkMode(), ...useWallet() };
  },
});
</script>

<style lang="sass" scoped>
#alpha
  border: 2px solid $negative
  border-radius: 15px
  color: $negative
  font-weight: bold
  font-size: 1rem
  padding: 1rem
</style>
