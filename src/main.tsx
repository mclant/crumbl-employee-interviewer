import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import InterviewPage from '@/pages/InterviewPage'
import DashboardPage from '@/pages/DashboardPage'
import { AuthGuard } from '@/components/AuthGuard'
import './index.css'

const queryClient = new QueryClient()

const rootRoute = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  ),
})

const interviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: InterviewPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  ),
})

const routeTree = rootRoute.addChildren([interviewRoute, dashboardRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
