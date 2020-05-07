<template>
  <div>
    <!-- Connect Wallet -->
    <div>
      <base-button
        color="primary"
        :full-width="fullWidth"
        :label="label"
        :loading="isLoading"
        @click="connectWallet"
      />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import helpers from 'src/mixins/helpers';

export default {
  name: 'ConnectWallet',

  mixins: [helpers],

  props: {
    fullWidth: {
      type: Boolean,
      required: false,
      default: false,
    },

    label: {
      type: String,
      required: false,
      default: 'Connect Wallet',
    },
  },

  data() {
    return {
      isLoading: false,
    };
  },

  computed: {
    ...mapState({
      signer: (state) => state.main.signer,
      userAddress: (state) => state.main.userAddress,
    }),
  },

  methods: {
    async connectWallet() {
      try {
        this.isLoading = true;
        await window.ethereum.enable();
        await this.$store.dispatch('user/setEthereumData', window.ethereum);
      } catch (err) {
        this.showError(err, 'Unable to connect wallet. Please try again.');
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
