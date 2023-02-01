<template>
  <q-circular-progress
    show-value
    class="text-primary q-mx-auto q-my-xl"
    :value="percentage"
    size="4rem"
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
    percentage: { type: Number, required: true },
  },
  setup(props) {
    return { props };
  },
});
</script>
