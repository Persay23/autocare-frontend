import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Auth screens (public)
import Login from './pages/Login'
import Register from './pages/Register'

// App screens (protected)
import Home from './pages/Home'
import CarPark from './pages/CarPark'
import VehicleDetail from './pages/VehicleDetail'
import Expenses from './pages/Expenses'
import Timeline from './pages/Timeline'
import Profile from './pages/Profile'
import AddVehicle from './pages/AddVehicle'

import RecordDetail from './pages/RecordDetail'
import CreateRecord from './pages/CreateRecord'
import EditRecord from './pages/EditRecord'
import ComponentDetail from './pages/ComponentDetail'
import CreateComponent from './pages/CreateComponent'
import EditComponent from './pages/EditComponent'
import FuelDetail from './pages/FuelDetail'
import CreateFuelEntry from './pages/CreateFuelEntry'
import EditFuelEntry from './pages/EditFuelEntry'
import PredictionDetail from './pages/PredictionDetail'


export default function App() {
  return (
    <BrowserRouter>
        <Routes>
          {/* Public — accessible without being logged in */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected — ProtectedRoute checks the cookie before rendering */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/carpark" element={<CarPark />} />
            <Route path="/vehicles/new" element={<AddVehicle />} />

            <Route path="/fuel/new" element={<CreateFuelEntry />} />
            <Route path="/records/new" element={<CreateRecord />} />

            <Route path="/vehicles/:vehicleId/records/new" element={<CreateRecord />} />
            <Route path="/vehicles/:vehicleId/records/:recordId" element={<RecordDetail />} />
            <Route path="/vehicles/:vehicleId/records/:recordId/edit" element={<EditRecord />} />

            <Route path="/vehicles/:vehicleId/components/new" element={<CreateComponent />} />
            <Route path="/vehicles/:vehicleId/components/:componentId" element={<ComponentDetail />} />
            <Route path="/vehicles/:vehicleId/components/:componentId/edit" element={<EditComponent />} />



            <Route path="/vehicles/:vehicleId/fuel/new" element={<CreateFuelEntry />} />
            <Route path="/vehicles/:vehicleId/fuel/:entryId/edit" element={<EditFuelEntry />} />
            <Route path="/vehicles/:vehicleId/fuel/:entryId" element={<FuelDetail />} />

            <Route path="/vehicles/:vehicleId/predictions/:predictionId" element={<PredictionDetail />} />


            {/* Vehicle detail has sub-routes for each tab */}
            {/* The /* is required so nested routes inside VehicleDetail work */}
            <Route path="/vehicles/:vehicleId/*" element={<VehicleDetail />} />

            <Route path="/expenses" element={<Expenses />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all — anything unknown goes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </BrowserRouter>
  )
}
