<template>
  <q-spinner-puff :class="customClass" color="primary" :size="size" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LoadingSpinner',
  props: {
    customClass: { type: String, default: 'text-primary q-mx-auto q-my-xl' },
    size: { type: String, default: '4em' },
  },
  setup() {
    return {};
  },
});
</script>
