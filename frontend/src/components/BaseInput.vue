<template>
  <q-input
    v-model="content"
    :autofocus="autofocus"
    :autogrow="autogrow"
    :bg-color="bgColor"
    color="primary"
    class="q-my-sm"
    data-cy="base-input"
    :dense="dense"
    filled
    :hide-bottom-space="hideBottomSpace"
    :hint="hintString"
    :label="label"
    :lazy-rules="lazyRules"
    :rules="[(val) => rules(val)]"
    :type="type"
    :outlined="outlined"
    :placeholder="placeholder"
    standout
    @blur="hideHint"
    @focus="showHint"
    @input="handleInput"
  >
    <template v-if="appendButtonLabel" v-slot:append>
      <base-button
        class="cursor-pointer"
        :disable="appendButtonDisable"
        :label="appendButtonLabel"
        @click="handleClick"
      />
    </template>
  </q-input>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'BaseInput',

  props: {
    appendButtonDisable: {
      type: Boolean,
      required: false,
      default: false,
    },

    appendButtonLabel: {
      type: String,
      required: false,
      default: undefined,
    },

    autofocus: {
      type: Boolean,
      required: false,
      default: false,
    },

    autogrow: {
      type: Boolean,
      required: false,
      default: false,
    },

    bgColor: {
      type: String,
      required: false,
      default: undefined,
    },

    dense: {
      type: Boolean,
      required: false,
      default: false,
    },

    hideBottomSpace: {
      type: Boolean,
      required: false,
      default: false,
    },

    hint: {
      type: String,
      required: false,
      default: undefined,
    },

    label: {
      type: undefined,
      required: false,
      default: undefined,
    },

    lazyRules: {
      type: undefined, // can be true, false, or ondemand
      required: false,
      default: 'ondemand',
    },

    placeholder: {
      type: String,
      required: false,
      default: undefined,
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

    outlined: {
      type: Boolean,
      required: false,
      default: true,
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
      hintString: '',
    };
  },

  watch: {
    /**
     * @notice This is required for two-way binding when programtically updating the input
     * in the parent component using BaseInput
     */
    value(val) {
      this.content = val; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    },
  },

  methods: {
    handleClick() {
      this.$emit('click');
    },

    handleInput() {
      this.$emit('input', this.content);
    },

    hideHint() {
      this.hintString = '';
    },

    showHint() {
      this.hintString = this.hint;
    },
  },
});
</script>
