<template>
  <div>
    <!-- Instructions -->
    <p>
      Now we will associate your signature with this ENS address by asking you to sign
      a message. This will result in two prompts&mdash;one to get your
      signature, and one to send the transaction associating that signature with
      your ENS address. You will need ETH to complete this transaction.
      <br><br>
      Once complete, you will be able to simply give someone your ENS
      address and they can use that to send you funds on Umbra.
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
      Your ENS domain is propery configured!
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
import ethers from 'ethers';

const umbra = require('umbra-js');

const { utils } = ethers;
const { ens } = umbra;

export default {
  name: 'AccountSetupEnsConfig',

  data() {
    return {
      isLoading: undefined,
      bytecode: undefined, // currently not used
      isPending: true,
      pendingTxHash: undefined,
      userEnsPublicKey: undefined,
    };
  },

  computed: {
    ...mapState({
      provider: (state) => state.user.provider,
      signer: (state) => state.user.signer,
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
    }),

    isEnsConfigured() {
      return !!this.userEnsPublicKey;
    },
  },

  async mounted() {
    this.isLoading = true;
    if (this.userEnsDomain) {
      this.userEnsPublicKey = await ens.getPublicKey(this.userEnsDomain, this.provider);
    }
    this.isLoading = false;
  },

  methods: {
    async signMessage() {
      // Get user's signature
      this.isPending = true;
      const signature = await this.signer.signMessage(ens.umbraMessage);

      // Recover public key from signature
      const publicKey = await ens.getPublicKeyFromSignature(signature);

      // Verify that recovered public key corresponds to user's address
      const recoveredAddress = utils.computeAddress(publicKey);
      const check1 = recoveredAddress === this.userAddress;
      const check2 = recoveredAddress === await utils.verifyMessage(ens.umbraMessage, signature);
      if (!check1 || !check2) {
        throw new Error('Something went wrong signing the message. Please try again');
      }

      // Send transaction associating public key and bytecode with ENS address
      await ens.setSignature(this.userEnsDomain, this.provider, signature);

      // Get updated public key to confirm signature was updated
      this.userEnsPublicKey = await ens.getPublicKey(this.userEnsDomain, this.provider);
      this.isPending = false;
    },
  },
};
</script>
