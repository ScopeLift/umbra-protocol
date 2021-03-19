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
              <div>
                <span v-if="userDisplayName" class="text-caption dark-toggle">
                  {{ userDisplayName }}
                </span>
                <span v-if="advancedMode" class="q-ml-md">
                  🧙 <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md"> Advanced mode is on </q-tooltip>
                </span>
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
        <!-- Column 1: User settings -->
        <div class="col">
          <!-- Dark mode toggle -->
          <q-icon
            v-if="!$q.dark.isActive"
            @click="toggleDarkMode"
            class="dark-toggle cursor-pointer"
            name="fas fa-moon"
          />
          <q-icon v-else @click="toggleDarkMode" class="dark-toggle cursor-pointer" name="fas fa-sun" />

          <!-- Advanced mode toggle -->
          <q-toggle
            @input="toggleAdvancedMode"
            :value="advancedMode"
            class="q-ml-lg"
            color="primary"
            icon="fas fa-cog"
          />
          <span class="dark-toggle text-caption">Advanced mode {{ advancedMode ? 'on' : 'off' }}</span>
          <span>
            <q-icon class="dark-toggle" right name="fas fa-question-circle">
              <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md" max-width="14rem">
                Enables advanced features such as private key export, additional recipient ID options, and event
                scanning settings. <span class="text-bold">Use with caution!</span>
              </q-tooltip>
            </q-icon>
          </span>
        </div>

        <!-- Column 2: Built by ScopeLift -->
        <div class="col text-center text-caption">
          Built by
          <a href="https://www.scopelift.co/" target="_blank" class="hyperlink">ScopeLift</a>
        </div>

        <!-- Column 3: Links -->
        <div class="col text-right">
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
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';

function useDarkMode() {
  onMounted(() => Dark.set(Boolean(LocalStorage.getItem('is-dark'))));

  function toggleDarkMode() {
    Dark.set(!Dark.isActive);
    LocalStorage.set('is-dark', Dark.isActive);
  }

  return { toggleDarkMode };
}

function useWallet() {
  const { userDisplayName, network } = useWalletStore();
  const networkName = ref('');

  watchEffect(() => {
    if (network.value) {
      networkName.value = network.value.name;
    }
  });

  return { userDisplayName, networkName };
}

export default defineComponent({
  name: 'BaseLayout',
  setup() {
    const { advancedMode, toggleAdvancedMode } = useSettingsStore();
    return { advancedMode, toggleAdvancedMode, ...useDarkMode(), ...useWallet() };
  },
});
</script>
