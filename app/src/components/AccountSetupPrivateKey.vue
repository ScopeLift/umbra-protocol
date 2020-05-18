<template>
  <div>
    Download a copy of your encrypted private key and save it on your computer.
    This is your backup in case your browser storage is lost or cleared.
    <span class="header-black">Do not lose this file or forget your password!</span>

    <base-button
      class="q-my-lg"
      label="Download File"
      @click="downloadFile"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { exportFile } from 'quasar';
import { ethers } from 'ethers';
import cryptography from 'src/mixins/cryptography';
import helpers from 'src/mixins/helpers';

export default {
  name: 'AccountSetupPrivateKey',

  mixins: [cryptography, helpers],

  data() {
    return {};
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      password: (state) => state.user.sensitive.password,
    }),
  },

  async created() {
    try {
      // Generate random wallet
      const wallet = ethers.Wallet.createRandom();

      // Encrypt private key and corresponding web3 wallet
      const data = {
        privateKey: wallet.privateKey, // randomly generated private key
        expectedWeb3Address: this.userAddress, // web3 wallet user is logged in with
      };
      const encrypted = await this.encryptPrivateKey(this.password, data);

      // Save to localStorage, read from localStorage, and decrypt to confirm everything worked
      this.$q.localStorage.set('umbra-data', encrypted);
      const localStorageData = this.$q.localStorage.getItem('umbra-data');
      const decrypted = await this.decryptPrivateKey(this.password, localStorageData);

      const isPrivateKeyEqual = data.privateKey === decrypted.privateKey;
      const isExpectedWeb3AddressEqual = data.expectedWeb3Address === decrypted.expectedWeb3Address;
      const wasSuccessful = isPrivateKeyEqual && isExpectedWeb3AddressEqual;

      // TODO clear state and localStorage if something went wrong
      if (!wasSuccessful) {
        throw new Error('Something went wrong during account setup. Please refresh the page and try again.');
      }

      // Save private key to state so we can sign message later
      this.$store.commit('user/setPrivateKey', wallet.privateKey);
    } catch (err) {
      this.showError(err);
    }
  },

  methods: {
    /**
     * @notice Prompt user to save a file with the encrypted data
     */
    async downloadFile() {
      try {
        const encrypted = this.$q.localStorage.getItem('umbra-data');
        const status = exportFile('umbra-data.txt', encrypted);
        if (!status) throw new Error(`Broswer blocked file download: ${status}`);
        this.$store.commit('user/setFileDownloadStatus', status);
      } catch (err) {
        this.showError(err);
      }
    },
  },
};
</script>
