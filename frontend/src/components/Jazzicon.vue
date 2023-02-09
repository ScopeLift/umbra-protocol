<template>
  <div class="flex" id="jazzicon" />
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import jazzicon from '@metamask/jazzicon';

export default defineComponent({
  name: 'JazziconComponent',
  props: {
    address: { type: String, required: true },
  },
  setup(props) {
    onMounted(() => {
      const width = 20;
      const identicon = jazzicon(width, parseInt(props.address.slice(2, 10), 16));
      document.querySelector('#jazzicon')?.appendChild(identicon);
    });
  },
});
</script>
