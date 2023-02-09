<template>
  <q-card class="border-top-thick">
    <q-card-section class="row justify-end q-my-none q-py-none">
      <q-btn class="text-caption text-muted" icon="fas fa-times" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />{{ $t('Argent.warning') }}
      </h5>
    </q-card-section>

    <q-card-section>
      <div v-html="$t('Argent.warning-paragraph')"></div>
    </q-card-section>

    <q-card-section>
      <div class="row justify-evenly">
        <base-button :label="$t('Argent.acknowledge-risks')" @click="context.emit('acknowledged')" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ArgentWarningModal',
  setup(_props, context) {
    return { context };
  },
});
</script>
