<template>
  <div>
    <q-select
      v-model="content"
      color="primary"
      class="q-my-sm"
      data-cy="base-select"
      :dense="dense"
      :disable="disable"
      :emit-value="emitValue"
      :filled="filled"
      :hide-bottom-space="hideBottomSpace"
      :hint="!hideBottomSpace ? hintString : undefined"
      :label="label"
      :lazy-rules="lazyRules"
      :options="options"
      :option-label="optionLabel"
      :outlined="outlined"
      :readonly="readonly"
      :rounded="rounded"
      :rules="[(val) => rules(val)]"
      @blur="hideHint"
      @focus="showHint"
      @input="handleInput"
    >
      <!-- Show icons when selected or when the slot is provided-->
      <template v-slot:prepend v-if="content && content.logoURI">
        <img :src="content.logoURI" height="25rem" />
      </template>
      <template v-slot:prepend v-else>
        <slot name="prepend"></slot>
      </template>

      <!-- Show icons in dropdown list -->
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps" v-on="scope.itemEvents">
          <q-item-section avatar v-if="scope.opt.logoURI">
            <img class="horizontal-center" :src="scope.opt.logoURI" height="25rem" />
          </q-item-section>
          <q-item-section>
            <q-item-label v-html="scope.opt[optionLabel]" />
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'BaseInput',

  props: {
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

    emitValue: {
      type: Boolean,
      required: false,
      default: false,
    },

    filled: {
      type: Boolean,
      required: false,
      default: true,
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

    options: {
      type: Array,
      required: true,
    },

    optionLabel: {
      type: String,
      required: false,
      default: 'value',
    },

    outlined: {
      type: Boolean,
      required: false,
      default: true,
    },

    readonly: {
      type: Boolean,
      required: false,
      default: false,
    },

    rounded: {
      type: Boolean,
      required: false,
      default: false,
    },

    rules: {
      type: Function,
      required: false,
      default() {
        return true;
      },
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
