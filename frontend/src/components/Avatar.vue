<template>
  <img v-if="avatar" :src="avatar" id="avatar" width='20px' style='border-radius: 50%' />
  <Jazzicon v-else :address="address" />
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';
import Jazzicon from 'src/components/Jazzicon.vue';

export default defineComponent({
  name: 'Avatar',
  components: { Jazzicon },
  props: {
    avatar: {
      type: (null as unknown) as PropType<string | null>,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
  },
});
</script>
