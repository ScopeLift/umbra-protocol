<template>
  <div>
    <q-input
      v-model="content"
      :autofocus="autofocus"
      :autogrow="autogrow"
      color="primary"
      class="q-my-sm"
      data-cy="base-input"
      :dense="dense"
      :hide-bottom-space="hideBottomSpace"
      :hint="hintString"
      :label="label"
      :lazy-rules="lazyRules"
      :mask="mask"
      :outlined="outlined"
      :reverse-fill-mask="reverseFillMask"
      :rules="[(val) => rules(val)]"
      :suffix="suffix"
      :type="type"
      :unmasked-value="unmaskedValue"
      @blur="hideHint"
      @focus="showHint"
      @input="handleInput"
    >
      <template v-if="appendIcon" v-slot:append>
        <q-icon class="cursor-pointer" :name="appendIcon" @click="$emit('icon-clicked')" />
      </template>
    </q-input>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'BaseInput',

  props: {
    appendIcon: {
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

    mask: {
      type: String,
      required: false,
    },

    reverseFillMask: {
      type: Boolean,
      required: false,
    },

    rules: {
      type: Function,
      required: false,
      default() {
        return true;
      },
    },

    suffix: {
      type: String,
      required: false,
      default: undefined,
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

    unmaskedValue: {
      type: Boolean,
      required: false,
      default: false,
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
