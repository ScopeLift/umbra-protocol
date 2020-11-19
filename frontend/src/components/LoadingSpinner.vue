<template>
  <div>
    <q-spinner-puff color="primary" size="4rem" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'LoadingSpinner',
  setup() {
    return {};
  },
});
</script>

<style lang="sass" scoped>
.google-login-button
  height: 3rem
</style>
