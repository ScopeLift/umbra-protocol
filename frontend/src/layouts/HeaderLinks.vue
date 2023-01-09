<template>
  <div>
    <router-link
      exactActiveClass="text-bold"
      :class="{ 'no-text-decoration': true, 'dark-toggle': true, 'text-subtitle1': isDrawer, 'q-pa-sm': isDrawer }"
      :to="{ name: 'home' }"
    >
      {{ $t('Header-Links.home') }}
    </router-link>
    <router-link
      exactActiveClass="text-bold"
      :class="{ 'no-text-decoration': true, 'dark-toggle': true, 'text-subtitle1': isDrawer, 'q-pa-sm': isDrawer }"
      :to="{ name: 'FAQ' }"
    >
      {{ $t('Header-Links.FAQ') }}
    </router-link>
    <router-link
      exactActiveClass="text-bold"
      :class="{ 'no-text-decoration': true, 'dark-toggle': true, 'text-subtitle1': isDrawer, 'q-pa-sm': isDrawer }"
      :to="{ name: 'contact' }"
    >
      {{ $t('Header-Links.contact') }}
    </router-link>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'HeaderLinks',
  props: {
    isDrawer: {
      type: Boolean,
      required: false,
    },
  },
  setup() {
    return {};
  },
});
</script>
