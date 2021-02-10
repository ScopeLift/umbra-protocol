<template>
  <q-spinner-puff class="text-center q-mx-auto q-my-xl" color="primary" size="4rem" />
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
