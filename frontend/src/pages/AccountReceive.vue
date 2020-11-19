<template>
  <q-page padding>
    <h1 class="page-title">Receive</h1>

    <div v-if="isScanning">
      <loading-spinner class="text-center q-my-xl" />
      <p class="text-center q-mb-none">Scanning for funds...</p>
      <p class="text-center text-caption">This may take a minute or two</p>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';

function useScan() {
  const isScanning = ref(false);
  onMounted(() => scan());

  function scan() {
    isScanning.value = true;
    //
    // isScanning.value = false;
  }

  return { isScanning };
}

export default defineComponent({
  name: 'PageReceive',
  setup() {
    return { ...useScan() };
  },
});
</script>
