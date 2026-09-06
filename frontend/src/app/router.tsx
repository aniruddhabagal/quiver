import { createBrowserRouter } from 'react-router'
import { LandingPage } from '../routes/landing/LandingPage'

const page = (loader: () => Promise<{ default: React.ComponentType }>) => async () => {
  const m = await loader()
  return { Component: m.default }
}

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/login', lazy: page(() => import('../routes/auth/LoginPage')) },
  { path: '/signup', lazy: page(() => import('../routes/auth/SignupPage')) },
  {
    path: '/app',
    lazy: async () => {
      const m = await import('../routes/app/AppLayout')
      return { Component: m.AppLayout }
    },
    children: [
      { index: true, lazy: page(() => import('../routes/app/Overview')) },
      { path: 'servers', lazy: page(() => import('../routes/app/Servers')) },
      { path: 'loadouts', lazy: page(() => import('../routes/app/Loadouts')) },
      { path: 'loadouts/:id', lazy: page(() => import('../routes/app/LoadoutEditor')) },
      { path: 'approvals', lazy: page(() => import('../routes/app/Approvals')) },
      { path: 'approvals/:id', lazy: page(() => import('../routes/app/ApprovalDetail')) },
      { path: 'calls', lazy: page(() => import('../routes/app/Calls')) },
      { path: 'playground', lazy: page(() => import('../routes/app/Playground')) },
      { path: 'analytics', lazy: page(() => import('../routes/app/Analytics')) },
      { path: 'keys', lazy: page(() => import('../routes/app/Keys')) },
      { path: 'settings', lazy: page(() => import('../routes/app/Settings')) },
    ],
  },
  { path: '*', lazy: page(() => import('../routes/NotFound')) },
])
