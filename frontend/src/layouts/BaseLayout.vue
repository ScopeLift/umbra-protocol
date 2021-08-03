<template>
  <q-layout view="hhh Lpr fff" style="z-index: 0">
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
              <div class="row">
                <connect-wallet>
                  <span v-if="userDisplayAddress" class="text-caption cursor-pointer dark-toggle">
                    {{ userDisplayAddress }}
                  </span>
                  <span v-else-if="!isSupportedNetwork" class="text-caption text-grey cursor-pointer dark-toggle">
                    <q-icon name="fas fa-exclamation-triangle" color="warning" left /> Unsupported network
                  </span>
                </connect-wallet>
                <span v-if="advancedMode" class="q-ml-md">
                  🧙 <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md"> Advanced mode is on </q-tooltip>
                </span>
              </div>
            </div>
          </div>
        </div>
        <!-- Alpha warning -->
        <div class="dark-toggle text-center text-negative text-bold q-my-md">
          This is beta software. Use at your own risk.
          <router-link class="hyperlink" :to="{ path: '/faq#security' }">Learn more</router-link>
        </div>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="q-mx-md q-mb-md q-pt-xl" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="row justify-between items-center all-content-format">
        <!-- Column 1: User settings -->
        <div class="col text-left">
          <p class="dark-toggle spaced-letters">Settings</p>
          <!-- Dark mode toggle -->
          <p class="dark-toggle">
            <q-icon v-if="!$q.dark.isActive" @click="toggleDarkMode" class="cursor-pointer icon" name="fas fa-moon" />
            <q-icon v-else @click="toggleDarkMode" class="dark-toggle cursor-pointer icon" name="fas fa-sun" />
            <span class="text-caption q-ml-md">Dark mode {{ $q.dark.isActive ? 'on' : 'off' }}</span>
          </p>

          <!-- Advanced mode toggle -->
          <p>
            <q-toggle
              @input="toggleAdvancedMode"
              :value="advancedMode"
              class="icon"
              color="primary"
              dense
              icon="fas fa-cog"
            />
            <span class="dark-toggle text-caption q-ml-md">Advanced mode {{ advancedMode ? 'on' : 'off' }}</span>
            <span>
              <q-icon class="dark-toggle" right name="fas fa-question-circle">
                <q-tooltip content-class="bg-muted dark-toggle shadow-2 q-pa-md" max-width="14rem">
                  Enables advanced features such as private key export, additional recipient ID options, and event
                  scanning settings. <span class="text-bold">Use with caution!</span>
                </q-tooltip>
              </q-icon>
            </span>
          </p>
          <!-- Empty paragraph, as a lazy way to ensure all columns are the same height, or repeat account setup -->
          <p v-if="!isAccountSetup">&nbsp;</p>
          <p v-else>
            <q-icon class="dark-toggle icon" name="fas fa-user q-mr-xs" />
            <span class="dark-toggle text-caption q-ml-sm">
              Repeat <router-link class="hyperlink" :to="{ name: 'setup' }">account setup</router-link>
            </span>
          </p>
          <!-- Empty paragraph, as a lazy way to ensure all columns are the same height -->
          <p>&nbsp;</p>
        </div>

        <!-- Column 2: Built by ScopeLift -->
        <div class="col text-left">
          <p class="dark-toggle spaced-letters">About</p>
          <p class="dark-toggle text-caption">
            Built by <a href="https://www.scopelift.co/" target="_blank" class="hyperlink">ScopeLift</a>
          </p>
          <p>
            <router-link class="hyperlink text-caption" :to="{ name: 'terms' }">Terms of Service</router-link>
          </p>
          <p>
            <router-link class="hyperlink text-caption" :to="{ name: 'privacy' }">Privacy Policy</router-link>
          </p>
          <!-- Empty paragraph, as a lazy way to ensure all columns are the same height -->
          <p>&nbsp;</p>
        </div>

        <!-- Column 3: Links -->
        <div class="col-auto text-left">
          <p class="dark-toggle spaced-letters">Links</p>
          <p>
            <a href="https://twitter.com/UmbraCash" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle" name="fab fa-twitter" size="xs" />
              <span class="hyperlink text-caption q-ml-md">Twitter</span>
            </a>
          </p>
          <p>
            <a href="https://t.me/UmbraCash" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle" name="fab fa-telegram" size="xs" />
              <span class="hyperlink text-caption q-ml-md">Telegram</span>
            </a>
          </p>
          <p>
            <a href="https://github.com/ScopeLift/umbra-protocol" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle" name="fab fa-github" size="xs" />
              <span class="hyperlink text-caption q-ml-md">GitHub</span>
            </a>
          </p>
          <p>
            <a href="mailto:support@umbra.cash" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle" name="fas fa-envelope" size="xs" />
              <span class="hyperlink text-caption q-ml-md">support@umbra.cash</span>
            </a>
          </p>
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, watchEffect } from '@vue/composition-api';
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
import ConnectWallet from 'components/ConnectWallet.vue';

function useWallet() {
  const { userDisplayAddress, network, isAccountSetup, isSupportedNetwork } = useWalletStore();
  const networkName = ref('');

  watchEffect(() => {
    if (network.value) {
      networkName.value = network.value.name;
    }
  });

  return { userDisplayAddress, networkName, isAccountSetup, isSupportedNetwork };
}

export default defineComponent({
  name: 'BaseLayout',
  components: { ConnectWallet },
  setup() {
    const { advancedMode, toggleAdvancedMode, isDark, toggleDarkMode } = useSettingsStore();
    return { advancedMode, toggleAdvancedMode, isDark, toggleDarkMode, ...useWallet() };
  },
});
</script>

<style lang="sass" scoped>
.icon
  width: 30px

.spaced-letters
  text-transform: uppercase
  letter-spacing: 0.4em
</style>
