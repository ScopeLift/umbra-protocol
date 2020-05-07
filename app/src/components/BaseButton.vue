<template>
  <div>
    <q-btn
      class="q-my-sm"
      :class="{'full-width': fullWidth}"
      :color="color"
      :dense="dense"
      :flat="flat"
      :label="label"
      :loading="loading"
      :outline="outline"
      @click="handleClick"
    />
  </div>
</template>

<script>
export default {
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

    outline: {
      type: Boolean,
      required: false,
      default: false,
    },
  },

  methods: {
    handleClick() {
      this.$emit('click');
    },
  },
};
</script>
