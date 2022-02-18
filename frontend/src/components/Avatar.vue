<template>
  <img :src="avatar" id="avatar" width='20px' style='border-radius: 50%' />
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';

export default defineComponent({
  name: 'Avatar',
  props: {
    avatar: {
      type: (null as unknown) as PropType<string | null>,
      required: true,
    },
  },
});
</script>
