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

    <!-- IF PRIVATE KEY IS IN LOCAL STORAGE -->
    <div
      v-else-if="isAccountSetupComplete"
      class="text-center"
    >
      Your account may have already been setup. Please enter your password below to confirm.
      <div class="row justify-center items-center">
        <div class="col-auto q-mr-sm">
          <base-input
            v-model="password"
            :dense="true"
            :hide-bottom-space="true"
            label="Enter Password"
            style="min-width: 300px"
            type="password"
          />
        </div>
        <div>
          <base-button
            class="col-auto q-ml-sm"
            label="Check"
            :disabled="!password"
            :loading="isCheckingStatus"
            @click="checkSetupStatus"
          />
        </div>
      </div>

      <div
        v-if="isAccountSetupConfirmed"
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
import cryptography from 'src/mixins/cryptography';
import helpers from 'src/mixins/helpers';

const umbra = require('umbra-js');

const { ens, KeyPair } = umbra;

export default {
  name: 'Setup',

  components: {
    ConnectWallet,
    AccountSetupChoosePassword,
    AccountSetupEnsCheck,
    AccountSetupEnsConfig,
    AccountSetupPrivateKey,
  },

  mixins: [cryptography, helpers],

  data() {
    return {
      isCheckingStatus: undefined,
      isAccountSetupComplete: undefined,
      isAccountSetupConfirmed: undefined,
      step: 1,
      password: undefined,
      encryptedData: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
      isEnsConfigured: (state) => state.user.isEnsConfigured,
      chainId: (state) => state.user.provider.chainId,
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
    this.isAccountSetupComplete = true;
  },

  methods: {
    async checkSetupStatus() {
      try {
        this.isCheckingStatus = true;
        // Decrypt data
        const data = await this.decryptPrivateKey(this.password, this.encryptedData);

        // Ensure addresses match
        if (this.userAddress !== data.expectedWeb3Address) {
          throw new Error('Wrong web3 account detected. Please switch to the correct web3 account and try again.');
        }

        // Get public key from the private key in local storage
        const keyPair = new KeyPair(data.privateKey);
        const publicKey1 = keyPair.publicKeyHex;

        // Get public key from the ENS address
        if (!this.userEnsDomain) {
          throw new Error('No ENS Account configured for the connected web3 account.');
        }
        const publicKey2 = await ens.getPublicKey(this.userEnsDomain, this.provider);
        this.isCheckingStatus = false;

        // Compare public keys
        if (publicKey1 !== publicKey2) {
          throw new Error('The locally saved key does not match the key associated with the ENS address.');
        }

        // Everything checks out
        this.isAccountSetupConfirmed = true;
      } catch (err) {
        this.showError(err);
        this.isCheckingStatus = false;
      }
    },
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
