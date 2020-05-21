<template>
  <div>
    <q-input
      v-model="content"
      class="q-my-sm"
      filled
      :dense="dense"
      :hide-bottom-space="hideBottomSpace"
      :label="label"
      :lazy-rules="lazyRules"
      :rules="[val => rules(val)]"
      :type="type"
      @input="handleInput"
    >
      <template
        v-if="iconAppend"
        v-slot:append
      >
        <q-icon
          class="cursor-pointer"
          :name="iconAppend"
          @click="$emit('iconClicked')"
        />
      </template>
    </q-input>
  </div>
</template>

<script>
export default {
  name: 'BaseInput',

  props: {
    dense: {
      type: Boolean,
      required: false,
      default: false,
    },

    iconAppend: {
      type: String,
      required: false,
      default: undefined,
    },

    hideBottomSpace: {
      type: Boolean,
      required: false,
      default: false,
    },

    label: {
      type: String,
      required: true,
      default: undefined,
    },

    lazyRules: {
      type: Boolean,
      required: false,
      default: true,
    },

    rules: {
      type: Function,
      required: false,
      default() {
        return true;
      },
    },

    type: {
      type: String,
      required: false,
      default: undefined,
    },

    value: {
      type: undefined,
      required: true,
      default: undefined,
    },
  },

  data() {
    return {
      content: this.value,
    };
  },

  watch: {
    /**
     * @notice This is required for two-way binding when programtically updating the input
     * in the parent component using BaseInput
     */
    value(val) {
      this.content = val;
    },
  },

  methods: {
    handleInput() {
      this.$emit('input', this.content);
    },
  },

};
</script>
