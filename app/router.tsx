import { createBrowserRouter, Navigate } from 'react-router-dom'
import { authRoutes } from './routes/_auth.routes'
import { vehicleRoutes } from './routes/_vehicles.routes'
import { globalRoutes } from './routes/_global.routes'

export const router = createBrowserRouter([
  ...authRoutes,
  ...globalRoutes,
  ...vehicleRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
])
