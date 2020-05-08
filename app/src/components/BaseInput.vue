<template>
  <div>
    <q-input
      v-model="content"
      class="q-my-sm"
      filled
      :label="label"
      lazy-rules
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
    iconAppend: {
      type: String,
      required: false,
      default: undefined,
    },

    label: {
      type: String,
      required: true,
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

  methods: {
    handleInput() {
      this.$emit('input', this.content);
    },
  },

};
</script>
