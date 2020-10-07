import { route } from 'quasar/wrappers';
import VueRouter from 'vue-router';
import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation
 */

export default route(function ({ Vue }) {
  Vue.use(VueRouter);

  const Router = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),
    routes,

    // Leave these as is and change from quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE,
  });

  Router.beforeEach((to, from, next) => {
    // Only allow user to navigate directly to home page to ensure a wallet is connected when they
    // visit any other page
    if (to.name === 'home') {
      // If visiting the home page, let the user go straight there
      next();
    } else if (from.name === null) {
      // Otherwise, if we went directly to a page (e.g. /send), redirect to the home page
      next({ name: 'home' });
    }
    next();
  });

  return Router;
});
