<template>
  <div>
    <q-input
      v-model="content"
      autocomplete="off"
      :autofocus="autofocus"
      :autogrow="autogrow"
      :bg-color="bgColor"
      color="primary"
      class="col q-my-sm"
      data-cy="base-input"
      :debounce="debounce"
      :dense="dense"
      :disable="disable"
      filled
      :hide-bottom-space="hideBottomSpace"
      :hint="hintString"
      :label="label"
      :lazy-rules="lazyRules"
      :rules="[(val) => rules(val)]"
      :suffix="suffix"
      :type="type"
      :min="type === 'number' ? 0 : undefined"
      :outlined="outlined"
      :placeholder="placeholder"
      ref="QInput"
      standout
      @blur="hideHint"
      @focus="showHint"
      @update:modelValue="handleInput"
    >
      <!--
      If we have a button, never show the loading slot because it makes the button jump left and right when the
      loading slot is shown / hidden
      -->
      <template v-if="appendButtonLabel" v-slot:loading></template>
      <template v-if="appendButtonLabel" v-slot:append>
        <base-button
          class="cursor-pointer"
          :disable="appendButtonDisable"
          :label="appendButtonLabel"
          :loading="appendButtonLoading"
          @click="handleClick"
        />
      </template>
    </q-input>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
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

    appendButtonLoading: {
      type: Boolean,
      required: false,
      default: false,
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

    debounce: {
      type: Number,
      required: false,
      default: 0,
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

    modelValue: {
      type: undefined,
      required: true,
      default: undefined,
    },

    placeholder: {
      type: undefined,
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
  },

  data() {
    return {
      content: this.modelValue,
      hintString: '',
    };
  },

  watch: {
    /**
     * @notice This is required for two-way binding when programmatically updating the input
     * in the parent component using BaseInput
     */
    modelValue(val) {
      this.content = val; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    },
  },

  emits: ['blur', 'click', 'update:modelValue'],

  methods: {
    handleClick() {
      this.$emit('click');
    },

    handleInput() {
      this.$emit('update:modelValue', this.content);
    },

    hideHint() {
      this.hintString = '';
      this.$emit('blur', this.content);
    },

    showHint() {
      this.hintString = (this as unknown as { hint: string }).hint;
    },
  },
});
</script>
