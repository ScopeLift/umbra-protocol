import VueCompositionApi from 'vue';
import { boot } from 'quasar/wrappers';

export default boot(({ Vue }) => {
  Vue.use(VueCompositionApi);
});
