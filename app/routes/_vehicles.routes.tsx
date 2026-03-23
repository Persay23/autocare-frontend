import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'

import AddVehicle      from './vehicles.new'
import VehicleLayout   from './vehicles._layout'

import VehicleOverview    from './vehicles.$vehicleId._index'
import VehicleRecords     from './vehicles.$vehicleId.records'
import VehicleComponents  from './vehicles.$vehicleId.components'
import VehicleFuel        from './vehicles.$vehicleId.fuel'
import VehiclePredictions from './vehicles.$vehicleId.predictions'

import RecordDetail   from './vehicles.$vehicleId.records.$recordId'
import CreateRecord   from './vehicles.$vehicleId.records.new'
import EditRecord     from './vehicles.$vehicleId.records.$recordId.edit'

import ComponentDetail  from './vehicles.$vehicleId.components.$componentId'
import CreateComponent  from './vehicles.$vehicleId.components.new'
import EditComponent    from './vehicles.$vehicleId.components.$componentId.edit'

import FuelDetail       from './vehicles.$vehicleId.fuel.$entryId'
import CreateFuelEntry  from './vehicles.$vehicleId.fuel.new'
import EditFuelEntry    from './vehicles.$vehicleId.fuel.$entryId.edit'

import PredictionDetail from './vehicles.$vehicleId.predictions.$predictionId'

export const vehicleRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/vehicles/new', element: <AddVehicle /> },

      // ── Record routes (must come before the wildcard vehicle layout) ──
      { path: '/vehicles/:vehicleId/records/new',              element: <CreateRecord /> },
      { path: '/vehicles/:vehicleId/records/:recordId',        element: <RecordDetail /> },
      { path: '/vehicles/:vehicleId/records/:recordId/edit',   element: <EditRecord /> },

      // ── Component routes ──────────────────────────────────────────────
      { path: '/vehicles/:vehicleId/components/new',                     element: <CreateComponent /> },
      { path: '/vehicles/:vehicleId/components/:componentId',            element: <ComponentDetail /> },
      { path: '/vehicles/:vehicleId/components/:componentId/edit',       element: <EditComponent /> },

      // ── Fuel routes ───────────────────────────────────────────────────
      { path: '/vehicles/:vehicleId/fuel/new',              element: <CreateFuelEntry /> },
      { path: '/vehicles/:vehicleId/fuel/:entryId',         element: <FuelDetail /> },
      { path: '/vehicles/:vehicleId/fuel/:entryId/edit',    element: <EditFuelEntry /> },

      // ── Prediction routes ─────────────────────────────────────────────
      { path: '/vehicles/:vehicleId/predictions/:predictionId', element: <PredictionDetail /> },

      // ── Vehicle detail with tabs (layout wraps the tab content) ───────
      {
        path: '/vehicles/:vehicleId/*',
        element: <VehicleLayout />,
        children: [
          { index: true,              element: <VehicleOverview /> },
          { path: 'records',          element: <VehicleRecords /> },
          { path: 'components',       element: <VehicleComponents /> },
          { path: 'fuel',             element: <VehicleFuel /> },
          { path: 'predictions',      element: <VehiclePredictions /> },
        ],
      },
    ],
  },
]
