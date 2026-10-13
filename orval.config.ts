import { defineConfig } from 'orval'

// Backend `schema.yml` dan tiplar va TanStack Query hooklarini yaratadi.
// Backend yangilanganda: schema.yml ni openapi/ ga ko'chiring va `npm run api:generate` ni ishga tushiring.
export default defineConfig({
  backend: {
    input: './openapi/schema.yml',
    output: {
      mode: 'tags-split',
      target: './src/shared/api/generated/endpoints',
      schemas: './src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/shared/api/mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
})
