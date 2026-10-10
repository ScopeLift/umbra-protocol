<template>
  <svg
    class="block-icon"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    :role="title ? 'img' : undefined"
    :aria-hidden="title ? undefined : 'true'"
  >
    <title v-if="title">{{ title }}</title>
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- Hidden back edges, drawn faintly so the block reads as translucent -->
      <path d="M13.5 4V14M4.5 17L13.5 14L19.5 17" stroke-opacity="0.35" />
      <!-- Top, right, and left faces -->
      <path d="M4.5 7L13.5 4L19.5 7L10.5 10Z" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <path d="M10.5 10L19.5 7V17L10.5 20Z" fill="currentColor" fill-opacity="0.08" stroke="none" />
      <path d="M4.5 7L10.5 10V20L4.5 17Z" fill="currentColor" fill-opacity="0.04" stroke="none" />
      <!-- Visible edges -->
      <path d="M4.5 7L13.5 4L19.5 7V17L10.5 20L4.5 17ZM4.5 7L10.5 10L19.5 7M10.5 10V20" stroke-opacity="0.9" />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'BlockIcon',
  props: {
    // Accessible label, also shown on hover; the icon is hidden from screen readers without one
    title: { type: String, required: false, default: undefined },
  },
});
</script>

<style lang="sass" scoped>
.block-icon
  width: 1.25em
  height: 1.25em
  vertical-align: -0.3em
  color: $dark

.body--dark .block-icon
  color: $lightgrey
</style>
