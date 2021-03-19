<template>
  <q-card class="border-top-thick">
    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />Warning!
      </h5>
    </q-card-section>

    <q-card-section>
      It looks like you are withdrawing to {{ addressDescription }}.
      <span class="text-bold">This is not recommended</span> unless you know what you are doing, as this may reduce or
      entirely remove the privacy guarantees provided by Umbra.
    </q-card-section>

    <q-card-section>
      <div class="row justify-evenly">
        <base-button label="Learn More" :outline="true" :to="{ name: 'FAQ' }" />
        <base-button label="I acknowledge the risks" @click="context.emit('acknowledged')" />
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'AccountReceiveTableWarning',

  props: {
    addressDescription: {
      type: String,
      required: true,
    },
  },

  setup(_props, context) {
    return { context };
  },
});
</script>
