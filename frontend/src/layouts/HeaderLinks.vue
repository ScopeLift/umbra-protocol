<template>
  <div>
    <router-link active-class="text-bold" class="no-text-decoration dark-toggle" exact :to="{ name: 'home' }">
      Home
    </router-link>
    <router-link active-class="text-bold" class="no-text-decoration dark-toggle" exact :to="{ name: 'FAQ' }">
      FAQ
    </router-link>
    <router-link active-class="text-bold" class="no-text-decoration dark-toggle" exact :to="{ name: 'contact' }">
      Contact
    </router-link>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  name: 'HeaderLinks',

  props: {},
});
</script>
