<template>
  <div>
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
  </div>
</template>

<script>
import { mapState } from 'vuex';
import cryptography from 'src/mixins/cryptography';
import helpers from 'src/mixins/helpers';

const umbra = require('umbra-js');

const { ens, KeyPair } = umbra;

export default {
  name: 'UnlockAccount',

  mixins: [cryptography, helpers],

  data() {
    return {
      isCheckingStatus: undefined,
      password: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
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
