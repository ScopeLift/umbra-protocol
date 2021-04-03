<template>
  <base-input
    v-model="ensSubdomain"
    @click="registerSubdomain"
    appendButtonLabel="Register"
    :hideBottomSpace="true"
    suffix=".umbra.eth"
    style="max-width: 400px"
  />
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
  name: 'AccountSetupRegisterEnsSubdomain',
  setup() {
    const ensSubdomain = ref<string>();

    function registerSubdomain() {
      console.log('ensSubdomain: ', ensSubdomain.value);
      console.log('not implemented');
    }

    return { ensSubdomain, registerSubdomain };
  },
});
</script>
