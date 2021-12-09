<template>
  <q-card class="border-top-thick">
    <q-card-section class="row justify-end q-my-none q-py-none">
      <q-btn class="text-caption text-muted" icon="fas fa-times" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section>
      <h5 class="text-bold text-center q-mt-none">
        <q-icon name="fas fa-exclamation-triangle" color="warning" left />Warning!
      </h5>
    </q-card-section>

    <q-card-section>
      <p>
        You are withdrawing to <span class="code">{{ destinationAddress }}</span
        >, which has the following warnings:
      </p>
      <ul>
        <li v-html="warning" v-for="(warning, index) in warnings" :key="index" class="q-my-sm" />
      </ul>

      <span class="text-bold">Continuing with withdrawal is not recommended</span> unless you know what you are doing,
      as this may reduce or entirely remove the privacy properties provided by Umbra.
    </q-card-section>

    <q-card-section>
      <div class="row justify-evenly">
        <base-button @click="context.emit('acknowledged')" label="I acknowledge the risks" :outline="true" />
        <router-link class="no-text-decoration" target="_blank" to="/faq#receiving-funds">
          <!-- Button does nothing on click, but we wrap with router-link to open the page in a new tab -->
          <base-button label="Learn More" />
        </router-link>
      </div>
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api';

export default defineComponent({
  name: 'AccountReceiveTableWarning',

  props: {
    destinationAddress: {
      type: String,
      require: true,
    },
    warnings: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },

  setup(_props, context) {
    return { context };
  },
});
</script>
