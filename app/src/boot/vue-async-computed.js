import AsyncComputed from 'vue-async-computed';

// more info on params: https://quasar.dev/quasar-cli/cli-documentation/boot-files#Anatomy-of-a-boot-file
export default async ({ Vue }) => {
  Vue.use(AsyncComputed);
};
