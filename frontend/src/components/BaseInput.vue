<template>
  <div>
    <q-input
      v-model="content"
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
      standout
      @blur="hideHint"
      @focus="showHint"
      @input="handleInput"
    >
      <!-- 
      If we have a button, never show the loading slot because it makes the button jump left and right when the
      loading slot is shown / hidden 
    -->
      <template v-if="appendButtonLabel && !$q.screen.xs" v-slot:loading></template>
      <template v-if="appendButtonLabel && !$q.screen.xs" v-slot:append>
        <base-button
          class="cursor-pointer"
          :disable="appendButtonDisable"
          :label="appendButtonLabel"
          :loading="appendButtonLoading"
          @click="handleClick"
        />
      </template>
      <template v-else-if="counter && !$q.screen.xs" v-slot:append>
        <q-circular-progress
          :value="counter"
          size="2.75rem"
          :color="counter > 100 ? 'negative' : 'primary'"
          show-value
          track-color="grey-4"
        >
          {{ counter }} %
        </q-circular-progress>
      </template>
    </q-input>
    <base-button
      v-if="appendButtonLabel && $q.screen.xs"
      class="cursor-pointer"
      fullWidth
      :disable="appendButtonDisable"
      :label="appendButtonLabel"
      :loading="appendButtonLoading"
      @click="handleClick"
    />
    <q-circular-progress
      v-else-if="counter && $q.screen.xs"
      :value="counter"
      size="2.75rem"
      :color="counter > 100 ? 'negative' : 'primary'"
      show-value
      track-color="grey-4"
    >
      {{ counter }} %
    </q-circular-progress>
  </div>
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

    counter: {
      type: Number,
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
      this.$emit('blur', this.content);
    },

    showHint() {
      this.hintString = this.hint;
    },
  },
});
</script>
