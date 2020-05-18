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
      v-else-if="chainId !== '0x3'"
      class="text-center"
    >
      Please switch to the Ropsten network to continue
    </div>

    <!-- OTHERWISE, SHOW SETUP WIZARD -->
    <div v-else>
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
          >
            TODO
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
                color="primary"
                :disable="!isStepComplete"
                :label="step === 4 ? 'Finish' : 'Continue'"
                @click="$refs.stepper.next()"
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
import ConnectWallet from 'components/ConnectWallet';

export default {
  name: 'Setup',

  components: {
    ConnectWallet,
    AccountSetupChoosePassword,
    AccountSetupEnsCheck,
    AccountSetupEnsConfig,
  },

  data() {
    return {
      isAccountSetupComplete: undefined,
      step: 1,
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
      chainId: (state) => state.user.provider.chainId,
      sensitive: (state) => state.user.sensitive,
    }),

    isStepComplete() {
      if (this.step === 1) {
        return !!this.userEnsDomain;
      } if (this.step === 2) {
        return !!this.sensitive.password;
      }
      return false;
    },
  },

  mounted() {
    // Check localStorage for encrypted data
    const encryptedData = this.$q.localStorage.getItem('umbra-data');

    if (!encryptedData) {
      // Setup has not been completed
      this.isAccountSetupComplete = false;
      return;
    }
    console.log(1);
    // this.$q.localStorage.set('umbra-data', 123);
  },
};
</script>
