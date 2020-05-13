<template>
  <q-page padding>
    <h3 class="page-title">
      Account Setup
    </h3>

    <div
      v-if="!userAddress"
      class="text-center"
    >
      Please login to send funds
      <div class="row justify-center">
        <connect-wallet />
      </div>
    </div>

    <div
      v-else
      class="form"
    >
      <div class="text-caption text-center text-italic">
        Although this setup is optional, it is recommended for added privacy.
      </div>

      <!-- Step 1 -->
      <h5 class="header-bold primary">
        Step 1
      </h5>
      <account-setup-ens-check />

      <!-- Step 2 -->
      <h5 class="header-bold primary q-mt-xl">
        Step 2
      </h5>
      <account-setup-ens-config />
    </div>
  </q-page>
</template>

<script>
import { mapState } from 'vuex';
import AccountSetupEnsCheck from 'components/AccountSetupEnsCheck';
import AccountSetupEnsConfig from 'components/AccountSetupEnsConfig';
import ConnectWallet from 'components/ConnectWallet';

export default {
  name: 'Setup',

  components: {
    ConnectWallet,
    AccountSetupEnsCheck,
    AccountSetupEnsConfig,
  },

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
    }),
  },
};
</script>
