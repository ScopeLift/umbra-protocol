<template>
  <div>
    <!-- Connect Wallet button -->
    <div>
      <base-button
        color="primary"
        :full-width="fullWidth"
        :label="label"
        :loading="isLoading"
        @click="showDialog = true"
      />
    </div>

    <!-- Connect Wallet dialog -->
    <q-dialog v-model="showDialog">
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-center text-h5 header-black primary">
            Choose Wallet
          </div>
        </q-card-section>

        <q-card-section>
          <div class="column justify-center q-px-xl">
            <div
              class="text-center cursor-pointer q-my-lg"
              @click="connectPortis"
            >
              <img
                class="q-pa-md`"
                src="statics/wallets/portis.png"
                width="200px"
              >
            </div>

            <hr style="border: 1px solid grey; width:100%; opacity: 30%">

            <div
              class="text-center cursor-pointer q-my-lg"
              @click="connectMetaMask"
            >
              <img
                class="q-pa-md"
                src="statics/wallets/metamask.png"
                width="300px"
              >
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            color="primary"
            flat
            label="Close"
            :loading="isLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Portis from '@portis/web3';
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
      default: 'Log in',
    },
  },

  data() {
    return {
      isLoading: false,
      showDialog: undefined,
    };
  },

  computed: {
    ...mapState({
      signer: (state) => state.main.signer,
      userAddress: (state) => state.main.userAddress,
    }),
  },

  methods: {
    async connectPortis() {
      try {
        this.isLoading = true;
        // TODO update for mainnet support, currently hardcodes ropsten
        const portis = new Portis(process.env.PORTIS_KEY, 'ropsten');
        await this.$store.dispatch('user/setEthereumData', portis.provider);
      } catch (err) {
        this.showError(err, 'Unable to connect wallet. Please try again.');
      } finally {
        this.isLoading = false;
      }
    },

    async connectMetaMask() {
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
