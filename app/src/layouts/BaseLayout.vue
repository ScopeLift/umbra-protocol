<template>
  <q-layout view="lHh Lpr lFf">
    <q-header
      class="q-mx-md q-mt-md"
      style="color: #000000; background-color: rgba(0,0,0,0)"
    >
      <div class="row justify-between items-center no-wrap">
        <div class="col-auto">
          <!-- LOGO AND TITLE -->
          <div
            class="row justify-start items-center"
            style="cursor: pointer;"
            @click="$router.push({ name: 'home' })"
          >
            <img
              alt="Umbra logo"
              class="q-ml-md"
              src="statics/icons/favicon-128x128.png"
              style="max-width: 50px;"
            >
            <div class="text-h6 dark-toggle">
              <span class="primary">Umbra</span>
            </div>
          </div>
        </div>
        <!-- ADDRESS AND SETTINGS AND SETTINGS -->
        <div class="col-auto q-mr-md">
          <div class="row justify-end q-mt-xs">
            <q-icon
              v-if="!$q.dark.isActive"
              class="col-auto dark-toggle"
              name="fas fa-moon"
              style="cursor: pointer;"
              @click="toggleNightMode()"
            />
            <q-icon
              v-else
              class="col-auto dark-toggle"
              name="fas fa-sun"
              style="cursor: pointer;"
              @click="toggleNightMode()"
            />
          </div>
        </div>
      </div>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>

export default {
  name: 'BaseLayout',

  data() {
    return {};
  },

  methods: {
    toggleNightMode() {
      const isDark = !this.$q.dark.isActive;
      this.$q.dark.set(isDark);
      this.$q.localStorage.set('isDark', isDark);
      this.$store.commit('user/setDarkModeStatus', isDark);
    },
  },
};
</script>
