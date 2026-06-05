import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'

import AddVehicle      from '@/features/vehicles/VehicleCreatePage'
import EditVehicle     from '@/features/vehicles/VehicleEditPage'
import VehicleLayout   from '@/features/vehicles/VehicleLayout'
import VehicleOverview from '@/features/vehicles/VehicleOverviewPage'

import VehicleRecords     from '@/features/records/RecordListPage'
import VehicleParts       from '@/features/components/ComponentListPage'
import VehicleFuel        from '@/features/fuel/FuelListPage'
import VehiclePredictions from '@/features/predictions/PredictionListPage'

export const vehicleRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/vehicles/new',             element: <AddVehicle /> },
      { path: '/vehicles/:vehicleId/edit', element: <EditVehicle /> },

      // ── Vehicle tabs (layout wraps tab content) ───────────────────────
      {
        path: '/vehicles/:vehicleId/*',
        element: <VehicleLayout />,
        children: [
          { index: true,         element: <VehicleOverview /> },
          { path: 'records',     element: <VehicleRecords /> },
          { path: 'components',  element: <VehicleParts /> },
          { path: 'fuel',        element: <VehicleFuel /> },
          { path: 'predictions', element: <VehiclePredictions /> },
        ],
      },
    ],
  },
]
