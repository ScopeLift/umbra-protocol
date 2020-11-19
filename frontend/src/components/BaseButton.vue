<template>
  <div>
    <q-btn
      class="q-my-sm"
      :class="{ 'full-width': fullWidth }"
      :color="color"
      data-cy="base-button"
      :disable="disable"
      :dense="dense"
      :flat="flat"
      :icon="icon"
      :label="label"
      :loading="loading"
      :no-caps="noCaps"
      :outline="outline"
      :type="type"
      @click="handleClick"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
export default defineComponent({
  name: 'BaseButton',

  props: {
    color: {
      type: String,
      required: false,
      default: 'primary',
    },

    dense: {
      type: Boolean,
      required: false,
      default: false,
    },

    disable: {
      type: Boolean,
      required: false,
      default: false,
    },

    flat: {
      type: Boolean,
      required: false,
      default: false,
    },

    fullWidth: {
      type: Boolean,
      required: false,
      default: false,
    },

    icon: {
      type: String,
      required: false,
      default: undefined,
    },

    label: {
      type: String,
      required: true,
      default: undefined,
    },

    loading: {
      type: Boolean,
      required: false,
      default: false,
    },

    noCaps: {
      type: Boolean,
      required: false,
      default: true,
    },

    outline: {
      type: Boolean,
      required: false,
      default: false,
    },

    type: {
      type: String,
      required: false,
      default: 'button',
    },
  },

  setup(props, context) {
    function handleClick() {
      context.emit('click');
    }
    return { handleClick, props };
  },
});
</script>
