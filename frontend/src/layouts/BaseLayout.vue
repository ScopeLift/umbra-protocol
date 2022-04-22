<template>
  <q-layout view="hhh lpr ffr" style="z-index: 0">
    <q-header class="q-mx-md q-mt-md" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="column all-content-format">
        <!-- Main header -->
        <div class="row justify-between items-center no-wrap">
          <div class="col-sm-auto">
            <div class="row justify-start items-center">
              <!-- LOGO AND TITLE -->
              <div class="row items-center cursor-pointer">
                <div class="row items-center">
                  <img
                    @click="$router.push({ name: 'home' })"
                    alt="Umbra logo"
                    src="~assets/app-logo-128x128.png"
                    style="max-width: 50px"
                    class="q-ml-md"
                  />
                  <div v-if="$q.screen.gt.sm" @click="$router.push({ name: 'home' })" class="text-h5 dark-toggle">
                    <span class="primary header-black q-ml-md">Umbra</span>
                  </div>
                  <div v-else-if="$q.screen.xs">
                    <div v-if="isLoading" class="q-ml-md row">
                      <q-spinner color="primary" size="1em" />
                    </div>
                    <address-settings
                      v-else-if="!isLoading && (userDisplayName || network)"
                      :avatar="avatar"
                      :userAddress="userAddress"
                      :userDisplayName="userDisplayName"
                      :advancedMode="advancedMode"
                      class="q-ml-md row"
                    />
                  </div>
                </div>

                <!-- NAVIGATION LINKS -->
                <div v-if="!$q.screen.xs">
                  <header-links
                    :class="{
                      col: true,
                      'justify-center': true,
                      'q-ml-xs': true,
                      'q-col-gutter-x-xl': $q.screen.gt.sm,
                      'q-col-gutter-x-md': $q.screen.lt.md,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- HAMBURGER MENU -->
          <q-btn v-if="$q.screen.xs" flat @click="drawerRight = !drawerRight" icon="fas fa-bars" class="darkgrey" />
          <!-- ADDRESS AND SETTINGS AND NETWORK SELECTOR -->
          <div v-else class="col-sm-auto">
            <div v-if="isLoading" class="row justify-end items-center">
              <q-spinner color="primary" size="1em" />
            </div>
            <div v-else-if="!isLoading && (userDisplayName || network)" class="row justify-end items-center no-wrap">
              <div class="q-mr-md">
                <address-settings
                  :avatar="avatar"
                  :userAddress="userAddress"
                  :userDisplayName="userDisplayName"
                  :advancedMode="advancedMode"
                  class="row"
                />
              </div>
              <network-dropdown />
            </div>
            <connect-wallet v-else-if="!isLoading">
              <div class="row justify-end items-center">
                <connect-wallet>
                  <base-button
                    class="cursor-pointer"
                    color="primary"
                    label="Connect a wallet"
                    :outline="true"
                    :rounded="true"
                  />
                </connect-wallet>
              </div>
            </connect-wallet>
          </div>
        </div>
        <!-- Legacy warning -->
        <div
          v-if="!isAccountSetup && isAccountSetupLegacy"
          class="dark-toggle text-center text-bold q-my-md q-pa-md"
          style="border-radius: 15px"
          :style="isDark ? 'color: #FFEEEE; background-color: #780A0A' : 'color: #610404; background-color: #FACDCD'"
        >
          🚨🚨🚨 We've upgraded our name resolution system. Use the
          <router-link class="hyperlink" :to="{ name: 'setup' }">Setup</router-link> page to submit one transaction
          which migrates you to the updated system. You won't be able to receive Umbra transactions until you've done
          so.
          <router-link class="hyperlink" :to="{ path: '/faq#why-do-i-need-to-setup-my-account-again' }"
            >Learn more</router-link
          >. 🚨🚨🚨
        </div>
      </div>
    </q-header>

    <!-- Mobile drawer -->
    <q-drawer side="right" v-model="drawerRight" behavior="mobile" elevated :width="200" class="bg-grey-3">
      <div class="row justify-end">
        <q-btn
          v-if="$q.screen.xs"
          flat
          @click="drawerRight = !drawerRight"
          icon="fas fa-times"
          class="q-mt-md q-pr-md darkgrey"
          style="height: 50px"
        />
      </div>
      <div class="col q-col-gutter-y-sm q-px-md">
        <header-links :isDrawer="true" class="column q-col-gutter-y-sm" />
      </div>
      <div v-if="!isLoading && userDisplayName" class="row q-pt-sm q-px-md full-width">
        <network-dropdown />
      </div>
      <connect-wallet v-else-if="!isLoading">
        <base-button
          class="q-ml-md cursor-pointer"
          color="primary"
          label="Connect a wallet"
          :outline="true"
          :rounded="true"
        />
      </connect-wallet>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="q-mx-md q-mb-md q-pt-xl" style="color: #000000; background-color: rgba(0, 0, 0, 0)">
      <div class="row self-start justify-between all-content-format">
        <!-- Column 1: User settings -->
        <div class="col-xs-12 col-sm-4 q-mt-lg">
          <p class="dark-toggle spaced-letters">{{$t('Base-Layout.settings')}}</p>
          <!-- Dark mode toggle -->
          <p class="dark-toggle">
            <q-icon v-if="!$q.dark.isActive" @click="toggleDarkMode" class="cursor-pointer icon" name="fas fa-moon" />
            <q-icon v-else @click="toggleDarkMode" class="dark-toggle cursor-pointer icon" name="fas fa-sun" />
            <span class="text-caption q-ml-md">{{$t('Base-Layout.dark-mode')}} {{ $q.dark.isActive ? $t('Base-Layout.on') : $t('Base-Layout.off') }}</span>
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
            <span class="dark-toggle text-caption q-ml-md">{{$t('Base-Layout.advanced-mode')}} {{ advancedMode ? $t('Base-Layout.on') : $t('Base-Layout.off') }}</span>
            <span>
              <base-tooltip class="q-ml-sm" icon="fas fa-question-circle">
                {{$t('Base-Layout.advanced-mode-description')}}
                <span class="text-bold">{{$t('Base-Layout.caution')}}</span>
              </base-tooltip>
            </span>
          </p>
          <!-- Language selection -->
          <p>
            <select class="text-caption" v-model="$i18n.locale">
              <option value='en-us'>English</option>
              <option value='zh-cn'>中文</option>
             </select>
             <span class="text-caption q-ml-md">Language</span>
          </p>
        </div>

        <!-- Column 2: Built by ScopeLift -->
        <div class="col-xs-12 col-sm-4 q-mt-lg">
          <p class="dark-toggle spaced-letters">{{$t('Base-Layout.about')}}</p>
          <p class="dark-toggle text-caption" v-html="$t('Base-Layout.built-by')"></p>
          <p class="">
            <router-link class="hyperlink text-caption" :to="{ name: 'terms' }">{{$t('Base-Layout.terms')}}</router-link>
          </p>
          <p class="">
            <router-link class="hyperlink text-caption" :to="{ name: 'privacy' }">{{$t('Base-Layout.privacy')}}</router-link>
          </p>
        </div>

        <!-- Column 3: Links -->
        <div class="col-xs-12 col-sm-4 q-mt-lg">
          <p class="dark-toggle spaced-letters">{{$t('Base-Layout.links')}}</p>
          <p>
            <a href="https://twitter.com/UmbraCash" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle q-mr-md" name="fab fa-twitter" size="xs" />
              <span class="hyperlink text-caption">Twitter</span>
            </a>
          </p>
          <p>
            <a href="https://discord.com/invite/uw4y5J2p7C" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle q-mr-md" name="fab fa-discord" size="xs" />
              <span class="hyperlink text-caption">Discord</span>
            </a>
          </p>
          <p>
            <a href="https://github.com/ScopeLift/umbra-protocol" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle q-mr-md" name="fab fa-github" size="xs" />
              <span class="hyperlink text-caption">GitHub</span>
            </a>
          </p>
          <p>
            <a href="mailto:support@umbra.cash" target="_blank" class="no-text-decoration">
              <q-icon class="dark-toggle q-mr-md" name="fas fa-envelope" size="xs" />
              <span class="hyperlink text-caption">support@umbra.cash</span>
            </a>
          </p>
        </div>
      </div>
    </q-footer>

    <!-- Argent warning modal -->
    <q-dialog v-model="showArgentModal">
      <argent-warning-modal @acknowledged="argentModalDismissed = true" class="q-pa-lg" />
    </q-dialog>
  </q-layout>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import ArgentWarningModal from 'components/ArgentWarningModal.vue';
import BaseButton from 'src/components/BaseButton.vue';
import BaseTooltip from 'src/components/BaseTooltip.vue';
import ConnectWallet from 'src/components/ConnectWallet.vue';
import useSettingsStore from 'src/store/settings';
import useWalletStore from 'src/store/wallet';
import AddressSettings from './AddressSettings.vue';
import HeaderLinks from './HeaderLinks.vue';
import NetworkDropdown from './NetworkDropdown.vue';

export default defineComponent({
  name: 'BaseLayout',
  components: { AddressSettings, ArgentWarningModal, BaseButton, BaseTooltip, ConnectWallet, HeaderLinks, NetworkDropdown }, // prettier-ignore
  setup() {
    const { advancedMode, isDark, toggleAdvancedMode, toggleDarkMode } = useSettingsStore();
    const {
      avatar,
      isAccountSetup,
      isAccountSetupLegacy,
      isArgent,
      isLoading,
      network,
      userAddress,
      userDisplayName,
    } = useWalletStore();
    const argentModalDismissed = ref(false);
    const showArgentModal = computed(() => isArgent.value && !argentModalDismissed.value);
    return {
      avatar,
      advancedMode,
      argentModalDismissed,
      drawerRight: ref(false),
      isAccountSetup,
      isAccountSetupLegacy,
      isDark,
      isLoading,
      network,
      showArgentModal,
      toggleAdvancedMode,
      toggleDarkMode,
      userAddress,
      userDisplayName,
    };
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
