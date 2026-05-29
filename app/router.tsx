import { createBrowserRouter, Navigate } from 'react-router-dom'
import { authRoutes } from './routes/_auth.routes'
import { vehicleRoutes } from './routes/_vehicles.routes'
import { globalRoutes } from './routes/_global.routes'
import ErrorPage from './ui/ErrorPage'

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      ...authRoutes,
      ...globalRoutes,
      ...vehicleRoutes,
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
