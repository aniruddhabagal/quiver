import { type ReactNode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { DemoModeError } from '../lib/demo-mode'
import { ApiError } from '../lib/api'
import { AuthProvider } from '../lib/auth'

function describe(err: unknown): string {
  if (err instanceof DemoModeError) return err.message
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
  mutationCache: new MutationCache({
    onError: (err) => {
      if (err instanceof DemoModeError) toast(err.message, { description: 'Demo mode' })
      else toast.error(describe(err))
    },
  }),
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) return
      if (err instanceof DemoModeError) return
      toast.error(describe(err))
    },
  }),
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          style={
            {
              '--normal-bg': 'var(--color-raised)',
              '--normal-text': 'var(--color-fg-1)',
              '--normal-border': 'var(--color-hairline-strong)',
              '--border-radius': 'var(--radius-1)',
            } as React.CSSProperties
          }
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}
