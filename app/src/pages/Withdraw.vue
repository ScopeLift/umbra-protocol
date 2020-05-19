<template>
  <q-page padding>
    <h3 class="page-title">
      Withdraw
    </h3>

    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to withdraw funds funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <div v-else-if="isUmbraPrivateKeyLogin && !isScanning">
      <div class="text-center">
        Enter your password to continue
      </div>
      <unlock-account @unlocked="searchForFunds" />

      <div class="row justify-center q-mt-xl">
        <div
          class="text-caption hyperlink"
          @click="toggleInputMethod"
        >
          Login with private key
        </div>
      </div>
    </div>

    <div
      v-else-if="!isUmbraPrivateKeyLogin && !isScanning"
      class="text-center"
    >
      <div class="form">
        <div>
          Enter the private key associated with your public identifier, and we'll
          scan the blockchain for funds sent to a stealth address you control.
        </div>
        <input-private-key />

        <base-button
          :disabled="!privateKey"
          :full-width="true"
          label="Search For Funds"
          :loading="isScanning"
          @click="searchForFunds"
        />
      </div>

      <div class="row justify-center q-mt-xl">
        <div
          class="text-caption text-center hyperlink"
          @click="toggleInputMethod"
        >
          Login with Umbra password
        </div>
      </div>
    </div>

    <div v-if="isScanning">
      Scanning...
      <br>
      TODO
      <ol>
        <li>Check localstorage to see last block scanned from</li>
        <li>Scan for all Announcement events and parse out parameters</li>
        <li>Call `decrypt` on each set of outputs</li>
        <li>If decrypted outputed starts with `umbra-protocol-v0`, it's for this private key</li>
        <li>Save off block number of the last scanned block in localstorage</li>
        <li>Show list a table of accessible funds with the option to withdraw</li>
      </ol>
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'components/ConnectWallet';
import InputPrivateKey from 'components/InputPrivateKey';
import UnlockAccount from 'components/UnlockAccount';
import umbra from 'umbra-js';

const { KeyPair } = umbra;

export default {
  name: 'Withdraw',

  components: {
    ConnectWallet,
    InputPrivateKey,
    UnlockAccount,
  },

  data() {
    return {
      isScanning: undefined,
      isUmbraPrivateKeyLogin: true,
    };
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      privateKey: (state) => state.user.privateKey,
    }),

    keyPair() {
      if (!this.privateKey) return undefined;
      return new KeyPair(this.privateKey);
    },
  },

  methods: {
    searchForFunds() {
      this.isScanning = true;
      // this.isScanning = false;
    },

    toggleInputMethod() {
      this.isUmbraPrivateKeyLogin = !this.isUmbraPrivateKeyLogin;
    },
  },
};
</script>
