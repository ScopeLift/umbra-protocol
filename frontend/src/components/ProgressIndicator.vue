<template>
  <q-circular-progress
    show-value
    :class="customClass"
    :value="percentage"
    :size="size"
    color="primary"
    track-color="grey-3"
  >
    {{ percentage }}%
  </q-circular-progress>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ProgressIndicator',
  props: {
    customClass: { type: String, default: 'text-primary q-mx-auto q-my-xl' },
    percentage: { type: Number, required: true },
    size: { type: String, default: '4rem' },
  },
  setup(props) {
    return { props };
  },
});
</script>
