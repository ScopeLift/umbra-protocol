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

    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to continue
    </div>

    <!-- Main Action -->
    <div class="row justify-center">
      <!-- Send -->
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
        @click="navigateToPage('send')"
      >
        <q-card-section class="text-h6 header-black card-header">
          Send
        </q-card-section>
      </q-card>

      <!-- Withdraw -->
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
        @click="navigateToPage('withdraw')"
      >
        <q-card-section class="text-h6 header-black card-header">
          Withdraw
        </q-card-section>
      </q-card>

      <!-- ENS Setup -->
      <q-card
        class="col-auto card-border action-card"
        :class="{'not-logged-in': !userAddress}"
        @click="navigateToPage('setup')"
      >
        <q-card-section class="text-h6 header-black card-header">
          ENS Setup
        </q-card-section>
      </q-card>
    </div>

    <!-- Tutorial -->
    <div class="q-pt-xl">
      <the-tutorial
        id="tutorial"
        class="q-mt-xl q-pt-lg"
      />
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import TheTutorial from 'components/TheTutorial';

export default {
  name: 'Home',

  components: {
    TheTutorial,
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
    }),
  },

  methods: {
    navigateToPage(name) {
      if (this.userAddress) this.$router.push({ name });
    },
  },
};
</script>

<style lang="sass" scoped>
#tutorial
  border: 1px solid $primary
  border-radius: 15px
  padding-bottom: 3rem
</style>
