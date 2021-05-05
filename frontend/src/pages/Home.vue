<template>
  <q-page padding class="all-content-format">
    <div class="text-center q-mb-xl">
      <h2 class="header-black">Send Stealth Payments</h2>
      <h4 class="darkgrey q-mt-md">Only the sender and recipient know who received funds</h4>
    </div>

    <div class="row justify-center q-pt-xl">
      <home-action-card class="col q-mx-md" to="send" text="Send" description="Send funds to another user" />
      <home-action-card
        class="col q-mx-md"
        to="receive"
        text="Receive"
        description="View and withdraw received funds"
      />
      <home-action-card class="col q-mx-md" to="setup" text="Setup" description="Setup your account to receive funds" />
    </div>

    <div class="q-mt-xl row justify-center">
      <div class="tutorial col-auto">
        <h3 class="header-black text-center q-mt-none">Tutorial</h3>
        <div class="text-left">
          <!-- To Receive Funds -->
          <h5 class="text-center q-mt-xl">Receiving Funds</h5>
          <ol>
            <li>Use the <span class="text-bold">Setup</span> page to configure your ENS or CNS name</li>
            <li>Ask someone to send funds to your ENS or CNS name</li>
            <li>Check the <span class="text-bold">Receive</span> page to withdraw funds</li>
          </ol>
          <!-- To Send Funds -->
          <h5 class="text-center q-mt-xl">Sending Funds</h5>
          <ol>
            <li>Get the ENS or CNS name of the person you're sending funds to</li>
            <li>Complete the form on the <span class="text-bold">Send</span> page</li>
          </ol>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import HomeActionCard from 'components/HomeActionCard.vue';

export default defineComponent({
  name: 'PageHome',
  components: { HomeActionCard },
  setup() {
    return {};
  },
});
</script>

<style lang="sass" scoped>
.tutorial
  border: 1px solid $primary
  border-radius: 15px
  padding: 2rem
</style>
