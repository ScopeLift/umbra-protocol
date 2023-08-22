<template>
  <q-btn-dropdown
    @mouseover="isShown = true"
    @mouseleave="onRootMouseLeave"
    ref="rootRef"
    v-model="isShown"
    :dropdown-icon="icon"
    :label="label"
    menu-anchor="bottom middle"
    menu-self="top middle"
    :no-icon-animation="true"
    padding="0"
    flat
    :ripple="false"
    :size="size"
    :unelevated="true"
    :class="{ 'without-icon': icon === ' ' }"
    class="dark-toggle"
  >
    <q-item
      @mouseleave="onTooltipMouseLeave"
      ref="tooltipRef"
      class="bg-muted dark-toggle shadow-2 q-pa-md"
      style="max-width: 14rem; font-size: 10px; display: inline-block"
    >
      <slot />
    </q-item>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { QBtnDropdown, QItem } from 'quasar';

export default defineComponent({
  name: 'BaseTooltip',

  props: {
    label: {
      type: String,
      required: false,
      default: '',
    },
    icon: {
      type: String,
      required: false,
      default: ' ',
    },
    size: {
      type: String,
      required: false,
      default: 'xs',
    },
  },
  setup() {
    const isShown = ref(false);
    const rootRef = ref<InstanceType<typeof QBtnDropdown> | null>(null);
    const tooltipRef = ref<InstanceType<typeof QItem> | null>(null);

    const onRootMouseLeave = (e: MouseEvent) => {
      if (tooltipRef.value?.$el !== e.relatedTarget) {
        isShown.value = false;
      }
    };

    const onTooltipMouseLeave = (e: MouseEvent) => {
      if (!rootRef.value?.$el?.contains(e.relatedTarget as Node)) {
        isShown.value = false;
      }
    };

    return { isShown, rootRef, tooltipRef, onRootMouseLeave, onTooltipMouseLeave };
  },
});
</script>

<style lang="sass">
button.without-icon i
  display: none
</style>
