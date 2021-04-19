<template>
  <q-expansion-item :value="expanded" class="q-py-sm" group="faq" header-style="font-size: 1.1em;" :label="question">
    <q-card>
      <q-card-section>
        <slot></slot>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'FAQItem',

  props: {
    question: {
      type: String,
      required: true,
    },

    expanded: {
      type: Boolean,
      required: true,
    },
  },
});
</script>
