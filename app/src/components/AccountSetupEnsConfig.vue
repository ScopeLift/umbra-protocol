<template>
  <div>
    <!-- Instructions -->
    <p>
      Now we will associate the public key of your Umbra account with your ENS address.
      You will need ETH in your wallet to complete this transaction.
      <br><br>
      Once complete, anyone who knows your ENS address will be able to send you
      funds to an address not associated with your wallet.
    </p>
    <!-- ENS Check -->
    <div
      v-if="isLoading"
      class="text-center"
    >
      <q-spinner
        color="primary"
        size="2rem"
      />
      <div class="text-center texxt-italic">
        Loading...
      </div>
    </div>
    <div
      v-else-if="isEnsConfigured"
      class="q-mt-xl"
    >
      <q-icon
        left
        color="positive"
        name="fas fa-check"
      />
      Your account is propery configured and ready to use!
    </div>
    <div
      v-else
      class="q-mt-lg"
    >
      <base-button
        label="Sign message to finish setup"
        :loading="isPending"
        @click="signMessage"
      />
      <div
        v-if="isPending"
        class="text-left text-italic q-mt-md"
      >
        Your transaction is processing...
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { ethers } from 'ethers';
import helpers from 'src/mixins/helpers';

const umbra = require('umbra-js');

const { utils } = ethers;
const { ens, KeyPair, utils: umbraUtils } = umbra;

export default {
  name: 'AccountSetupEnsConfig',

  mixins: [helpers],

  data() {
    return {
      isLoading: undefined,
      bytecode: undefined, // currently not used
      isPending: undefined,
      pendingTxHash: undefined,
      userEnsPublicKey: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
      domainService: (state) => state.user.domainService,
      signer: (state) => state.user.signer,
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
      privateKey: (state) => state.user.sensitive.privateKey,
    }),

    isEnsConfigured() {
      // TODO: I enabled this code for testing locally, to be able to overwrite the signature.
      //  Probably we should even let a user do it. We'll need a warning message for it though,
      //  because user can potentially loose their payments that haven't been withdrawn.

      // if (this.privateKey) {
      //   return this.userEnsPublicKey === new KeyPair(this.privateKey).publicKeyHex;
      // }

      return !!this.userEnsPublicKey;
    },
  },

  async mounted() {
    this.isLoading = true;
    if (this.userEnsDomain) {
      this.userEnsPublicKey = await this.domainService.getPublicKey(this.userEnsDomain);
    }
    this.isLoading = false;
  },

  methods: {
    /**
     * @notice Get user's signature and associate it with their ENS address
     */
    async signMessage() {
      try {
        this.isPending = true;

        // TODO Read from local storage and prompt user for password instead of using state?
        let signature;
        let expectedAddress;
        if (!this.privateKey) {
          // User is not using an Umbra-specific key, so prompt them to sign message
          console.log("Using user's web3 wallet"); // eslint-disable-line no-console
          signature = await this.signer.signMessage(ens.umbraMessage);
          expectedAddress = this.userAddress;
        } else {
          // User is using an Umbra-specific key, so signing is automated
          console.log('Using Umbra-specific key'); // eslint-disable-line no-console
          const signer = new ethers.Wallet(this.privateKey);
          signature = await signer.signMessage(ens.umbraMessage);
          expectedAddress = (new KeyPair(this.privateKey)).address;
        }

        // Recover public key from signature
        const publicKey = await umbraUtils.getPublicKeyFromSignature(signature);

        // Verify that recovered public key corresponds to user's address
        const recoveredAddress = utils.computeAddress(publicKey);
        const check1 = recoveredAddress === expectedAddress;
        const check2 = recoveredAddress === await utils.verifyMessage(ens.umbraMessage, signature);

        if (!check1 || !check2) {
          throw new Error('Something went wrong signing the message. Please try again');
        }

        // Send transaction associating public key and bytecode with ENS address
        await this.domainService.setSignature(this.userEnsDomain, signature);

        // Get updated public key to confirm signature was updated
        this.userEnsPublicKey = await this.domainService.getPublicKey(this.userEnsDomain);
        if (this.userEnsPublicKey !== publicKey) {
          throw new Error('Something went wrong associating your signature with your ENS domain. Please refresh the page and try the setup process again');
        }

        // Everything ok, so we can update state
        this.$store.commit('user/setEnsStatus', true);
        this.isPending = false;
      } catch (err) {
        this.isPending = false;
        this.showError(err);
      }
    },
  },
};
</script>
