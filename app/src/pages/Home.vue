<template>
  <q-page padding>
    <div class="text-center q-mb-xl">
      <h2 class="header-black">
        Send Stealth Payments
      </h2>
      <h4 class="darkgrey q-mt-md">
        Only the sender and recipient know who received funds
      </h4>
    </div>

    <connect-wallet
      v-if="!userAddress"
      class="text-center"
      label="Login with MetaMask to continue"
    />

    <!-- Send -->
    <div class="row justify-center">
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
        @click="$router.push({name: 'send'})"
      >
        <q-card-section class="text-h6 header-black card-header">
          Send
        </q-card-section>
      </q-card>

      <!-- Receive -->
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
        @click="$router.push({name: 'receive'})"
      >
        <q-card-section class="text-h6 header-black card-header">
          Receive
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import ConnectWallet from 'src/components/ConnectWallet';

export default {
  name: 'Home',

  components: {
    ConnectWallet,
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
    }),
  },
};
</script>
