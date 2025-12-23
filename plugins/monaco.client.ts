import { loader } from '@guolao/vue-monaco-editor'

export default defineNuxtPlugin(() => {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
    }
  })
})
