# Vehicle Maintenance Frontend - Refactor Report

## Summary

This refactor focused on:

- structure cleanup
- naming consistency
- duplicate code reduction
- shared constants extraction
- correctness fixes in logic and routing

## Major Changes Applied

### 1. Shared Constants And Utilities

Added centralized constants and utilities:

- `src/constants/enums.js`
- `src/constants/icons.js`
- `src/utils/formatters.js`
- `src/utils/predictions.js`

Moved duplicated local arrays/maps to shared constants:

- fuel types
- service types
- component types/states
- transmission/engine/vehicle type lists
- prediction status order
- component/service icon maps

### 2. Shared UI State Components

Added:

- `src/components/shared/AsyncStates.jsx`

This now provides common:

- loading state
- error state/banner
- empty state

### 3. Shared Page/Form Styles

Added:

- `src/styles/pageStyles.js`
- `src/components/shared/formStyles.js`

Removed duplicated inline style constants from multiple pages.

### 4. API Layer Deduplication

Removed duplicated API functions from `src/api/vehicles.js` and used domain-specific modules:

- `src/api/expenses.js`
- `src/api/timeline.js`
- `src/api/components.js`

Added:

- `src/api/users.js` for profile/password updates

### 5. Route And Page Consolidation

Consolidated duplicate create pages:

- deleted `src/pages/CreateRecordGlobal.jsx`
- deleted `src/pages/CreateFuelEntryGlobal.jsx`

Updated routes in `src/App.jsx` to use shared pages:

- `/records/new` and `/vehicles/:vehicleId/records/new` -> `CreateRecord`
- `/fuel/new` and `/vehicles/:vehicleId/fuel/new` -> `CreateFuelEntry`

### 6. Correctness Fixes

Applied logic and behavior fixes:

- fixed login error message precedence bug in `src/pages/Login.jsx`
- fixed case-sensitive asset import in `src/pages/Home.jsx` (`Logo.png`)
- fixed vehicle worst-state ordering in `src/components/vehicles/VehicleCard.jsx`
- unified prediction confidence handling across card/detail screens
- removed `window.location.reload()` usage (replaced with callback refresh flow in `VehicleDetail` + `VehicleOverview`)
- removed debug logs from fuel screens
- fixed delete button labels (`Delete Entry`, `Delete Component`)
- removed impure `Date.now()` render logic in component detail (lint purity issue)

### 7. Naming And File Cleanup

Removed inconsistent/unused files:

- `src/pages/_helpers.jsx`
- `src/pages/_styles.jsx`
- `src/App.css`
- `src/components/shared/formStyles.jsx`

Refactor now uses consistent/shared replacements listed above.

## Current Project Situation

## Structure Status

Structure is now cleaner and more modular:

- `api` split by domain
- shared UI helpers under `components/shared`
- shared enums/icons/utilities centralized
- duplicate create flows removed

## Consistency Status

Naming and usage consistency improved:

- common enums and icon sets reused
- form styles reused
- page state rendering reused
- API calls aligned to correct modules

## Duplication Status

Significant duplication removed:

- global + vehicle-specific create forms
- repeated type arrays/maps
- repeated status components in tabs
- repeated form-style constants

Some intentional duplication still exists in inline visual styles for highly custom screens and can be extracted later if desired.

## Validation Status

Checks run after refactor:

- `npm run lint`: **PASS**
- `npm run build`: **BLOCKED IN ENVIRONMENT**

Build is still failing with environment/tooling error:

- `spawn EPERM` from Vite config loading (same environment-level issue as before refactor)

This appears unrelated to application source logic changes.

