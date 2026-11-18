import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // يعمل على جذر الموقع وعلى مسار فرعي (GitHub Pages: /اسم-المستودع/)
  plugins: [react()],
})
