export default defineNuxtConfig({
  modules: ['../src/module'],

  bullmq: {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  },

  devtools: { enabled: true },
  compatibilityDate: '2024-07-08',
})
