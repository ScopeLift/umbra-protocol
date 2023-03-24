import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/BaseLayout.vue'),
    children: [
      { name: 'home', path: '', component: () => import('pages/Home.vue') },
      { name: 'send', path: '/send', component: () => import('pages/AccountSend.vue') },
      { name: 'receive', path: '/receive', component: () => import('pages/AccountReceive.vue') },
      { name: 'sent', path: '/sent', component: () => import('pages/AccountSent.vue') },
      { name: 'setup', path: '/setup', component: () => import('pages/AccountSetup.vue') },
      { name: 'contact', path: '/contact', component: () => import('src/pages/Contact.vue') },
      { name: 'FAQ', path: '/faq', component: () => import('src/pages/FAQ.vue') },
      { name: 'terms', path: '/terms', component: () => import('src/pages/TermsOfService.vue') },
      { name: 'privacy', path: '/privacy', component: () => import('src/pages/PrivacyPolicy.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue'),
  },
];

export default routes;
