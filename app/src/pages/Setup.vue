<template>
  <q-page padding>
    <h3 class="page-title">
      Account Setup
    </h3>

    <div class="form">
      <div class="text-caption text-center text-italic">
        Although this setup is optional, it is recommended for added privacy.
      </div>

      <!-- Step 1 -->
      <h5 class="header-bold primary">
        Step 1
      </h5>
      <account-setup-ens-check />

      <!-- Step 2 -->
      <h5 class="header-bold primary">
        Step 2
      </h5>
      <account-setup-ens-config />
    </div>
  </q-page>
</template>

<script>
import AccountSetupEnsCheck from 'components/AccountSetupEnsCheck';
import AccountSetupEnsConfig from 'components/AccountSetupEnsConfig';

export default {
  name: 'Setup',

  components: {
    AccountSetupEnsCheck,
    AccountSetupEnsConfig,
  },
};
</script>
