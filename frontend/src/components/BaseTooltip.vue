<template>
  <q-btn-dropdown
    @mouseover.native="isShown = true"
    @mouseleave.native="!keepOpen ? (isShown = false) : undefined"
    v-model="isShown"
    :dropdown-icon="icon"
    :label="label"
    menu-anchor="bottom middle"
    menu-self="top middle"
    :no-icon-animation="true"
    padding="0"
    flat
    :ripple="false"
    size="xs"
    :unelevated="true"
    :class="{ 'without-icon': icon === ' ' }"
  >
    <q-item
      @mouseleave.native="isShown = false"
      v-close-popup
      class="bg-muted dark-toggle shadow-2 q-pa-md"
      style="max-width: 14rem; font-size: 10px; display: inline-block"
    >
      <slot />
    </q-item>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
  name: 'BaseTooltip',

  props: {
    label: {
      type: String,
      required: false,
      default: '',
    },
    icon: {
      type: String,
      required: false,
      default: ' ',
    },
    keepOpen: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  setup() {
    const isShown = ref(false);

    return { isShown };
  },
});
</script>

<style lang="sass">
button.without-icon i
  display: none
</style>
