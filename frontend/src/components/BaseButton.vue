<template>
  <div>
    <q-btn
      :class="{ 'full-width': fullWidth }"
      :color="color"
      data-cy="base-button"
      :disable="disable"
      :dense="dense"
      :flat="flat"
      :loading="loading"
      :label="label"
      no-caps
      :outline="outline"
      :padding="padding"
      :rounded="rounded"
      :size="size"
      :text-color="textColor"
      :type="type"
    >
      <q-icon v-if="icon" size="0.875rem" :name="icon" :class="iconMargin" />
    </q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
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

    iconMargin: {
      type: String,
      required: false,
      default: 'q-mx-xs',
    },

    label: {
      type: String,
      required: true,
    },

    loading: {
      type: Boolean,
      required: false,
      default: false,
    },

    outline: {
      type: Boolean,
      required: false,
      default: false,
    },

    padding: {
      type: String,
      required: false,
      default: undefined,
    },

    rounded: {
      type: Boolean,
      required: false,
      default: false,
    },

    size: {
      type: String,
      required: false,
      default: undefined,
    },

    textColor: {
      type: String,
      required: false,
      default: undefined,
    },

    type: {
      type: String,
      required: false,
      default: 'button',
    },
  },
});
</script>
