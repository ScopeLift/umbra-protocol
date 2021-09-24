<template>
  <q-btn-dropdown
    :dropdown-icon="icon"
    :label="label"
    menu-anchor="bottom middle"
    menu-self="top middle"
    :no-icon-animation="true"
    padding="0"
    :ripple="false"
    size="xs"
    :unelevated="true"
  >
    <q-list>
      <q-item v-close-popup class="bg-muted dark-toggle shadow-2 q-pa-md" style="max-width: 14rem; font-size: 10px">
        <q-item-section>
          <slot />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'ClickableTooltip',

  props: {
    label: {
      type: String,
      required: false,
      default: '',
    },
    icon: {
      type: String,
      required: false,
      default: '',
    },
  },
});
</script>
