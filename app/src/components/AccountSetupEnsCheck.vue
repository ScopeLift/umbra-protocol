<template>
  <div>
    <!-- Instructions -->
    <p>
      Make sure you are logged in with an account that has an associated ENS domain.
    </p>
    <!-- ENS Check -->
    <div class="q-mt-xl">
      <div v-if="userEnsDomain === undefined">
        <q-spinner
          color="primary"
          size="3rem"
        />
        <div>
          Loading...
        </div>
      </div>
      <div v-else-if="userEnsDomain">
        <q-icon
          left
          color="positive"
          name="fas fa-check"
        />
        You're all set!
        <br>
        <span class="text-caption">The ENS domain
          <span class="text-bold">{{ userEnsDomain }}</span>
          resolves to this address
        </span>
      </div>
      <div v-else>
        <q-icon
          left
          color="negative"
          name="fas fa-exclamation-triangle"
        />
        This address does not have an associated ENS domain.
        <br>
        <span class="text-caption">
          Either navigate to the home page, refresh, and login with a different address,
          or follow
          <a
            class="hyperlink"
            href="https://medium.com/@eric.conner/the-ultimate-guide-to-ens-names-aa541586067a"
            target="_blank"
          >this guide</a>
          to learn how to purchase a domain and configure it to resolve to
          your Ethereum address.
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'AccountSetupEnsCheck',

  computed: {
    ...mapState({
      userAddress: (state) => state.user.userAddress,
      userEnsDomain: (state) => state.user.userEnsDomain,
      provider: (state) => state.user.ethersProvider,
    }),
  },
};
</script>
