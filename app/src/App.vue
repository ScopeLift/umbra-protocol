<template>
  <div id="q-app">
    <router-view />
  </div>
</template>

<script >
export default {
  name: 'App',

  mounted() {
    const isDark = this.$q.localStorage.getItem('isDark');
    this.$q.dark.set(isDark);
    this.$store.commit('user/setDarkModeStatus', isDark);
  },
};
</script>
