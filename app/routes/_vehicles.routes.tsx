import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'

import AddVehicle      from './vehicles/create'
import EditVehicle     from './vehicles/edit'
import VehicleLayout   from './vehicles/layout'
import VehicleOverview from './vehicles/overview'

import VehicleRecords from './records/list'
import CreateRecord   from './records/create'
import RecordDetail   from './records/detail'
import EditRecord        from './records/edit'
import RecordComponents from './records/components'

import VehicleComponents from './components/list'
import CreateComponent   from './components/create'
import EditComponent     from './components/edit'

import VehicleFuel   from './fuel/list'

import VehiclePredictions from './predictions/list'

export const vehicleRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/vehicles/new', element: <AddVehicle /> },
      { path: '/vehicles/:vehicleId/edit', element: <EditVehicle /> },

      // ── Records ───────────────────────────────────────────────────────
      { path: '/vehicles/:vehicleId/records/new',                       element: <CreateRecord /> },
      { path: '/vehicles/:vehicleId/records/:recordId',                element: <RecordDetail /> },
      { path: '/vehicles/:vehicleId/records/:recordId/edit',           element: <EditRecord /> },
      { path: '/vehicles/:vehicleId/records/:recordId/components',     element: <RecordComponents /> },

      // ── Components ────────────────────────────────────────────────────
      { path: '/vehicles/:vehicleId/components/new',               element: <CreateComponent /> },
      { path: '/vehicles/:vehicleId/components/:componentId/edit', element: <EditComponent /> },

      // ── Vehicle tabs (layout wraps tab content) ───────────────────────
      {
        path: '/vehicles/:vehicleId/*',
        element: <VehicleLayout />,
        children: [
          { index: true,         element: <VehicleOverview /> },
          { path: 'records',     element: <VehicleRecords /> },
          { path: 'components',  element: <VehicleComponents /> },
          { path: 'fuel',        element: <VehicleFuel /> },
          { path: 'predictions', element: <VehiclePredictions /> },
        ],
      },
    ],
  },
]
