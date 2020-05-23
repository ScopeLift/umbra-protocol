<template>
  <q-page padding>
    <h3 class="page-title">
      Account Setup
    </h3>

    <!-- IF WALLET IS NOT CONNECTED -->
    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login and connect to Ropsten to setup your account
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <!-- IF NOT ON THE CORRECT NETWORK -->
    <div
      v-else-if="networkName !== 'ropsten'"
      class="text-center"
    >
      Please switch to the Ropsten network to continue
    </div>

    <!-- IF PRIVATE KEY IS IN LOCAL STORAGE -->
    <div
      v-else-if="isAccountSetupComplete"
      class="text-center"
    >
      <div
        v-if="!sensitive.privateKey"
        class="form text-justify"
      >
        Your account may have already been setup. To confirm, please enter your password below.
        <unlock-account button-label="Check" />
      </div>

      <div
        v-if="sensitive.privateKey"
        class="q-mt-xl"
      >
        <div class="positive-border">
          <q-icon
            left
            color="positive"
            name="fas fa-check"
          />
          You are good to go! Simply share the ENS address
          <span class="text-bold">{{ userEnsDomain }}</span>
          with someone and they can use it to send you funds
        </div>
      </div>
    </div>

    <!-- OTHERWISE, SHOW SETUP WIZARD -->
    <div v-else>
      <div
        class="text-center text-bold"
        style="margin:0 auto"
      >
        Because this is alpha software, these steps must be completed in one sitting. If you
        leave mid-setup, you must start the process over.
      </div>

      <div class="text-center q-my-md">
        The whole setup process will only take 1&ndash;2 minutes.
      </div>
      <div class="q-pa-md">
        <q-stepper
          ref="stepper"
          v-model="step"
          alternative-labels
          color="primary"
          animated
        >
          <q-step
            :name="1"
            title="ENS Domain Check"
            icon="fas fa-tools"
            :done="step > 1"
          >
            <account-setup-ens-check />
          </q-step>

          <q-step
            :name="2"
            title="Choose Password"
            icon="fas fa-lock"
            :done="step > 2"
          >
            <account-setup-choose-password />
          </q-step>

          <q-step
            :name="3"
            title="Save Key"
            icon="fas fa-key"
            :done="step > 3"
          >
            <account-setup-private-key />
          </q-step>

          <q-step
            :name="4"
            title="ENS Domain Setup"
            icon="fas fa-user-cog"
          >
            <account-setup-ens-config />
          </q-step>

          <template v-slot:navigation>
            <q-stepper-navigation class="row justify-start">
              <base-button
                v-if="step < 4"
                color="primary"
                :disable="!isStepComplete"
                label="Continue"
                @click="$refs.stepper.next()"
              />
              <base-button
                v-else-if="step === 4"
                color="primary"
                :disable="!isStepComplete"
                label="Finish"
                @click="$router.push({name: 'home'})"
              />
              <base-button
                v-if="step > 1"
                flat
                color="primary"
                label="Back"
                class="q-ml-sm"
                @click="$refs.stepper.previous()"
              />
            </q-stepper-navigation>
          </template>
        </q-stepper>
      </div>
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import AccountSetupChoosePassword from 'components/AccountSetupChoosePassword';
import AccountSetupEnsCheck from 'components/AccountSetupEnsCheck';
import AccountSetupEnsConfig from 'components/AccountSetupEnsConfig';
import AccountSetupPrivateKey from 'components/AccountSetupPrivateKey';
import ConnectWallet from 'components/ConnectWallet';
import UnlockAccount from 'components/UnlockAccount';

export default {
  name: 'Setup',

  components: {
    ConnectWallet,
    AccountSetupChoosePassword,
    AccountSetupEnsCheck,
    AccountSetupEnsConfig,
    AccountSetupPrivateKey,
    UnlockAccount,
  },

  data() {
    return {
      isAccountSetupComplete: undefined,
      step: 1,
      encryptedData: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
      isEnsConfigured: (state) => state.user.isEnsConfigured,
      networkName: (state) => state.user.networkName,
      sensitive: (state) => state.user.sensitive,
    }),

    isStepComplete() {
      if (this.step === 1) return !!this.userEnsDomain;
      if (this.step === 2) return !!this.sensitive.password;
      if (this.step === 3) return !!this.sensitive.wasPrivateKeyDownloaded;
      if (this.step === 4) return !!this.isEnsConfigured;
      return false;
    },
  },

  mounted() {
    // Check localStorage for encrypted data
    this.encryptedData = this.$q.localStorage.getItem('umbra-data');

    if (!this.encryptedData) {
      // Setup has not been completed
      this.isAccountSetupComplete = false;
      return;
    }

    // Setup was completed
    this.isAccountSetupComplete = true;
  },
};
</script>

<style lang="sass" scoped>
.positive-border
  border: 1px solid $positive
  border-radius: 15px
  padding: 1rem
  text-align: center
</style>
