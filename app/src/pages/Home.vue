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

    <!-- Main Action -->
    <div class="row justify-evenly">
      <!-- Send -->
      <q-card
        class="col-xs-7 col-sm-3 card-border action-card"
        @click="navigateToPage('send')"
      >
        <q-card-section class="text-h6 header-black card-header">
          Send
        </q-card-section>
      </q-card>

      <!-- Withdraw -->
      <q-card
        class="col-xs-7 col-sm-3 card-border action-card"
        @click="navigateToPage('withdraw')"
      >
        <q-card-section class="text-h6 header-black card-header">
          Withdraw
        </q-card-section>
      </q-card>

      <!-- ENS Setup -->
      <q-card
        class="col-xs-7 col-sm-3 card-border action-card"
        @click="navigateToPage('setup')"
      >
        <q-card-section class="text-h6 header-black card-header">
          ENS Setup
        </q-card-section>
      </q-card>
    </div>

    <!-- Tutorial -->
    <div class="q-mt-xl q-pt-xl q-mx-md">
      <the-tutorial id="tutorial" />
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
      this.$router.push({ name });
    },
  },
};
</script>

<style lang="sass" scoped>
#tutorial
  border: 1px solid $primary
  border-radius: 15px
  padding: 1rem 0
</style>
