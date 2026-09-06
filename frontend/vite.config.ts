import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// gsap, ScrollTrigger and lenis are dynamically imported by the landing motion
// hook, so they already land in their own chunk without manual configuration.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
})
