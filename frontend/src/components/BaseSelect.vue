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
      ref="QSelect"
      :rounded="rounded"
      :rules="[(val) => rules(val)]"
      @blur="hideHint"
      @focus="showHint"
      @update:modelValue="handleInput"
    >
      <!-- Show icons when selected or when the slot is provided-->
      <template v-slot:prepend v-if="content && content.logoURI">
        <img :src="content.logoURI" style="height: 1.5rem" />
      </template>
      <template v-slot:prepend v-else>
        <slot name="prepend"></slot>
      </template>

      <!-- Show icons in dropdown list -->
      <template v-slot:option="scope">
        <q-item v-bind="scope.itemProps" v-on="scope.itemProps">
          <q-item-section avatar v-if="scope.opt.logoURI">
            <img class="horizontal-center" :src="scope.opt.logoURI" style="height: 1.5rem" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt[optionLabel] }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="tokenBalances">
            <q-item-label class="text-right">
              {{ humanizeTokenAmount(tokenBalances[scope.opt.address], scope.opt) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { humanizeTokenAmount } from 'src/utils/utils';

export default defineComponent({
  name: 'BaseSelect',

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

    modelValue: {
      type: undefined,
      required: true,
      default: undefined,
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

    // If provided, assumes the list given is a token list and shows token balances in the dropdown.
    tokenBalances: {
      type: Object,
      required: false,
    },
  },

  data() {
    return {
      content: this.modelValue,
      hintString: '',
      humanizeTokenAmount,
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

  emits: ['update:modelValue'],

  methods: {
    handleInput() {
      this.$emit('update:modelValue', this.content);
    },

    hideHint() {
      this.hintString = '';
    },

    showHint() {
      this.hintString = (this as unknown as { hint: string }).hint;
    },
  },
});
</script>
