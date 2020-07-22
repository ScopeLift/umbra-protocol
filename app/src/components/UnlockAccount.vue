<template>
  <div>
    <base-input
      v-model="password"
      label="Enter Password"
      style="min-width: 300px"
      type="password"
    />

    <div v-if="domainIsNotFound">
      If you own a domain without a reverse record set, try to specify it manually:
      <base-input
        v-model="domainName"
        label="Domain Name"
      />
    </div>

    <base-button
      :label="buttonLabel"
      :disabled="!password"
      :full-width="true"
      :loading="isCheckingStatus"
      @click="checkSetupStatus"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import cryptography from 'src/mixins/cryptography';
import helpers from 'src/mixins/helpers';

const umbra = require('umbra-js');

const { KeyPair } = umbra;

export default {
  name: 'UnlockAccount',

  mixins: [cryptography, helpers],

  props: {
    buttonLabel: {
      type: String,
      required: false,
      default: 'Check',
    },
  },

  data() {
    return {
      isCheckingStatus: undefined,
      password: undefined,
      domainName: undefined,
      domainIsNotFound: false,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
      domainService: (state) => state.user.domainService,
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
    }),
  },

  methods: {
    async checkSetupStatus() {
      try {
        this.isCheckingStatus = true;
        // Decrypt data
        const encryptedData = this.$q.localStorage.getItem('umbra-data');
        const data = await this.decryptPrivateKey(this.password, encryptedData);

        // Ensure addresses match
        if (this.userAddress !== data.expectedWeb3Address) {
          throw new Error('Wrong web3 account detected. Please switch to the correct web3 account and try again.');
        }

        // Get public key from the private key in local storage
        const keyPair = new KeyPair(data.privateKey);
        const publicKey1 = keyPair.publicKeyHex;

        let publicKey2;
        if (this.domainName) {
          publicKey2 = await this.domainService.getPublicKey(this.domainName);
          this.$store.commit('user/setUserDomain', this.domainName);
        } else if (!this.userEnsDomain) { // Get public key from the ENS address
          this.domainIsNotFound = true;
          throw new Error('No ENS Account configured for the connected web3 account.');
        } else {
          publicKey2 = await this.domainService.getPublicKey(this.userEnsDomain);
        }
        this.isCheckingStatus = false;

        if (!publicKey2) {
          throw new Error("The associated ENS address isn't set up for stealth payments.");
        }
        this.domainIsNotFound = false;

        // Compare public keys
        if (publicKey1 !== publicKey2) {
          throw new Error('The locally saved key does not match the key associated with the ENS address.');
        }

        // Everything checks out
        this.$store.commit('user/setPrivateKey', data.privateKey);
        this.$emit('unlocked');
      } catch (err) {
        this.showError(err);
        this.isCheckingStatus = false;
      }
    },
  },
};
</script>
