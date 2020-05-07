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
      >
        <q-card-section class="text-h6 header-black card-header">
          Send
        </q-card-section>
      </q-card>

      <!-- Receive -->
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
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

<style lang="sass" scoped>
.action-card
  cursor: pointer
  margin: 1rem
  max-width: 200px
  min-width: 150px
  padding: 1rem

.card-header
  color: $primary
  text-align: center

.not-logged-in
  opacity: 0.35
  cursor: not-allowed

</style>
