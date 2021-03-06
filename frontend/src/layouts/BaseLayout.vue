<template>
  <q-layout view="hhh Lpr fff">
    <q-header class="q-mx-md q-mt-md" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="column all-content-format">
        <!-- Main header -->
        <div>
          <div class="row justify-between items-center no-wrap all-content-format">
            <div class="col-auto">
              <div class="row justify-start items-center">
                <!-- LOGO AND TITLE -->
                <img
                  @click="$router.push({ name: 'home' })"
                  alt="Umbra logo"
                  class="col-auto cursor-pointer q-ml-md"
                  src="~assets/app-logo-128x128.png"
                  style="max-width: 50px"
                />
                <div @click="$router.push({ name: 'home' })" class="col-auto text-h5 cursor-pointer dark-toggle">
                  <span class="primary header-black q-ml-md">Umbra</span>
                </div>

                <!-- NAVIGATION LINKS -->
                <div class="col-auto q-ml-xl">
                  <router-link
                    active-class="text-bold"
                    class="no-text-decoration dark-toggle"
                    exact
                    :to="{ name: 'home' }"
                    >Home</router-link
                  >
                </div>
                <div class="col-auto q-ml-xl">
                  <router-link
                    active-class="text-bold"
                    class="no-text-decoration dark-toggle"
                    exact
                    :to="{ name: 'FAQ' }"
                    >FAQ</router-link
                  >
                </div>
                <div class="col-auto q-ml-xl">
                  <router-link
                    active-class="text-bold"
                    class="no-text-decoration dark-toggle"
                    exact
                    :to="{ name: 'contact' }"
                    >Contact</router-link
                  >
                </div>
              </div>
            </div>

            <!-- ADDRESS AND SETTINGS AND SETTINGS -->
            <div class="col-auto q-mr-md">
              <div v-if="userAddress" class="text-caption dark-toggle">
                {{ userAddress }}
              </div>
            </div>
          </div>
        </div>
        <!-- Alpha warning -->
        <div class="dark-toggle text-center text-negative text-bold q-my-md">
          WARNING: This is unaudited software and is only available on Rinkeby
        </div>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="q-mx-md q-mb-md q-pt-xl" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="row justify-between">
        <div class="col-auto">
          <q-icon
            v-if="!$q.dark.isActive"
            class="dark-toggle"
            name="fas fa-moon"
            size="xs"
            style="cursor: pointer"
            @click="toggleDarkMode()"
          />
          <q-icon
            v-else
            class="dark-toggle"
            name="fas fa-sun"
            size="xs"
            style="cursor: pointer"
            @click="toggleDarkMode()"
          />
        </div>
        <div class="col-auto text-caption">
          Built by
          <a href="https://www.scopelift.co/" target="_blank" class="hyperlink">ScopeLift</a>
        </div>
        <div class="col-auto">
          <a href="https://twitter.com/UmbraCash" target="_blank" class="no-text-decoration">
            <q-icon class="dark-toggle" name="fab fa-twitter" size="xs" />
          </a>
          <a href="https://t.me/UmbraCash" target="_blank" class="q-ml-md no-text-decoration">
            <q-icon class="dark-toggle" name="fab fa-telegram" size="xs" />
          </a>
          <a href="https://github.com/ScopeLift/umbra-protocol" target="_blank" class="q-ml-md no-text-decoration">
            <q-icon class="dark-toggle" name="fab fa-github" size="xs" />
          </a>
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watchEffect } from '@vue/composition-api';
import { Dark, LocalStorage } from 'quasar';
import useWalletStore from 'src/store/wallet';

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
  const { userAddress, network } = useWalletStore();
  const networkName = ref('');

  watchEffect(() => {
    if (network.value) {
      networkName.value = network.value.name;
    }
  });

  return { userAddress, networkName };
}

export default defineComponent({
  name: 'BaseLayout',
  setup() {
    return { ...useDarkMode(), ...useWallet() };
  },
});
</script>
