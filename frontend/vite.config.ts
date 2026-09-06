import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// gsap, ScrollTrigger and lenis are dynamically imported by the landing motion
// hook, so they already land in their own chunk without manual configuration.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
  optimizeDeps: {
    // Pre-bundle everything the lazy app routes use, so the dev server never
    // discovers a dependency mid-session and hands React a second copy.
    include: [
      'react-router',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
      '@xyflow/react',
      '@dagrejs/dagre',
      'recharts',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'radix-ui',
      'sonner',
      'zustand',
      'class-variance-authority',
      'tailwind-merge',
      'lucide-react',
    ],
  },
})
