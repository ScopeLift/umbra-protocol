<template>
  <q-card class="border-top-thick">
    <q-card-section class="row justify-end q-my-none q-py-none">
      <q-btn class="text-caption text-muted" icon="fas fa-times" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        Danger <q-icon name="fas fa-exclamation-triangle" class="danger" left />
      </h5>
    </q-card-section>

    <q-card-section>
      <p>
        It looks like you're trying to withdraw your funds to token contract. It is very likely this is not what you
        intend, and proceeding will likely result in a loss of funds. Do not proceed unless you know exactly what you
        are doing.
      </p>
      <q-checkbox v-model="acknowledgeWarning"> I know what I am doing </q-checkbox>
    </q-card-section>

    <q-card-section>
      <div class="row justify-evenly">
        <base-button @click="context.emit('acknowledged')" :label="'Withdraw Anyway'" :disable="!acknowledgeWarning" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
  name: 'AccountReceiveTableLossWarning',

  props: {},

  setup(_props, context) {
    const acknowledgeWarning = ref(false);
    return { context, acknowledgeWarning };
  },
});
</script>
