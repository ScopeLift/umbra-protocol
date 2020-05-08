<template>
  <div>
    <!-- Instructions -->
    <p>
      Now we will associate your signature with this ENS address by asking you to sign
      a message. This will result in two prompts&mdash;one to get your
      signature, and one to send the transaction associating that signature with
      your ENS address.
      <br><br>
      Once complete, you will be able to simply give someone your ENS
      address and they can use that to send you funds on Umbra.
    </p>
    <!-- ENS Check -->
    <div class="q-mt-lg">
      <base-button
        label="Sign message to finish setup"
        @click="signMessage"
      />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ethers from 'ethers';

const { utils } = ethers;

export default {
  name: 'AccountSetupEnsConfig',

  data() {
    return {
      message: 'This signature associates my public key with my ENS address for use with Umbra.',
      bytecode: undefined, // currently not used
    };
  },

  computed: {
    ...mapState({
      signer: (state) => state.user.signer,
      userAddress: (state) => state.user.userAddress,
    }),
  },

  methods: {
    async signMessage() {
      // Get signature
      const signature = await this.signer.signMessage(this.message);

      // Recover public key from signature
      const msgHash = utils.hashMessage(this.message);
      const msgHashBytes = utils.arrayify(msgHash);
      const publicKey = await utils.recoverPublicKey(msgHashBytes, signature);

      // Verify that recovered public key corresponds to user's address
      const recoveredAddress = utils.computeAddress(publicKey);
      const check1 = recoveredAddress === this.userAddress;
      const check2 = recoveredAddress === await utils.verifyMessage(this.message, signature);
      if (!check1 || !check2) {
        throw new Error('Something went wrong signing the message. Please try again');
      }

      // Send transaction associating public key and bytecode with ENS address
      // TODO
    },
  },
};
</script>
