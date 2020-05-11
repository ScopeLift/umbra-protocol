
const routes = [
  {
    path: '/',
    component: () => import('layouts/BaseLayout.vue'),
    children: [
      { name: 'home', path: '', component: () => import('pages/Home.vue') },
      { name: 'send', path: '/send', component: () => import('pages/Send.vue') },
      { name: 'withdraw', path: '/withdraw', component: () => import('pages/Withdraw.vue') },
      { name: 'setup', path: '/setup', component: () => import('pages/Setup.vue') },
    ],
  },
];

// Always leave this as last one
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue'),
  });
}

export default routes;
