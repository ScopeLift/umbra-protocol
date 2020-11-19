<template>
  <q-page padding>
    <h1 class="page-title">Send</h1>

    <!-- If not logged in -->
    <account-send-form />
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import AccountSendForm from 'components/AccountSendForm.vue';

export default defineComponent({
  name: 'PageAccountSend',
  components: { AccountSendForm },
  setup() {
    return {};
  },
});
</script>
