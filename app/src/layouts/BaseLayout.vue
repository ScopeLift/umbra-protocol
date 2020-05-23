<template>
  <q-layout view="hhh Lpr fFf">
    <q-header
      class="q-mx-md q-mt-md"
      style="color: #000000; background-color: rgba(0,0,0,0)"
    >
      <div class="column all-content-format">
        <!-- Main header -->
        <div>
          <div class="row justify-between items-center no-wrap all-content-format">
            <div class="col-auto">
              <!-- LOGO AND TITLE -->
              <div
                class="row justify-start items-center"
                style="cursor: pointer;"
                @click="$router.push({ name: 'home' })"
              >
                <img
                  alt="Umbra logo"
                  class="q-ml-md"
                  src="statics/icons/favicon-128x128.png"
                  style="max-width: 50px;"
                >
                <div class="text-h5 dark-toggle">
                  <span class="primary header-black q-ml-md">Umbra</span>
                </div>
              </div>
            </div>
            <!-- ADDRESS AND SETTINGS AND SETTINGS -->
            <div class="col-auto q-mr-md">
              <div
                v-if="userAddress"
                class="text-caption dark-toggle"
              >
                Address: {{ userAddress }}
              </div>
              <div class="row justify-end items-center q-mt-xs">
                <div
                  v-if="userAddress && !isCorrectNetwork"
                  class="negative text-bold q-mr-md"
                >
                  You must be on the Ropsten network to use this app
                </div>
                <q-icon
                  v-if="!$q.dark.isActive"
                  class="col-auto dark-toggle"
                  name="fas fa-moon"
                  style="cursor: pointer;"
                  @click="toggleNightMode()"
                />
                <q-icon
                  v-else
                  class="col-auto dark-toggle"
                  name="fas fa-sun"
                  style="cursor: pointer;"
                  @click="toggleNightMode()"
                />
                <connect-wallet
                  v-if="!userAddress"
                  class="q-ml-lg"
                />
              </div>
            </div>
          </div>
        </div>
        <!-- Alpha warning -->
        <div
          id="alpha"
          class="text-center q-mt-lg"
          style="max-width: 600px; margin: 1rem auto"
        >
          WARNING: This is alpha software and is only available on Ropsten
        </div>
      </div>
    </q-header>

    <q-page-container class="all-content-format">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';

export default {
  name: 'BaseLayout',

  components: {
    ConnectWallet,
  },

  data() {
    return {};
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      networkName: (state) => state.user.networkName,
    }),

    isCorrectNetwork() {
      return this.networkName === 'ropsten';
    },
  },

  methods: {
    toggleNightMode() {
      const isDark = !this.$q.dark.isActive;
      this.$q.dark.set(isDark);
      this.$q.localStorage.set('isDark', isDark);
      this.$store.commit('user/setDarkModeStatus', isDark);
    },
  },
};
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
