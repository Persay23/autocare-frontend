# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**AutoCare** — mobile-first vehicle maintenance tracking SPA, built as a diploma project. The developer has strong .NET backend experience but is learning React — explain frontend patterns explicitly.

Currency is **Polish złoty (zł)**. The app is mobile-first and capped at ~430px viewport width.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build
npm run lint      # ESLint validation
npm run preview   # Preview production build
```

No test suite. Backend runs at `https://localhost:7235`. Set `VITE_API_URL` to override (see `.env.example`).

## Architecture

React 19 + React Router v7 + Vite. No Redux — state is React Context (auth only) + `useState` per page.

### Key directories

- `src/api/` — Axios instance + domain-split modules: `auth.js`, `vehicles.js`, `records.js`, `components.js`, `fuel.js`, `expenses.js`, `timeline.js`, `predictions.js`, `users.js`. Never import from `axios` directly — always use the shared instance.
- `src/context/AuthContext.jsx` — Global auth: `user`, `loading`, `login()`, `logout()`. Checks session every 60s.
- `src/context/useAuth.js` — Always import `useAuth` from here, not from `AuthContext.jsx` (avoids ESLint fast-refresh warning).
- `src/App.jsx` — All route definitions. More specific routes (e.g. `/vehicles/new`) must come before param routes (`/vehicles/:vehicleId/*`) or React Router treats `new` as a vehicleId.
- `src/pages/` — One file per page + `src/pages/tabs/` for the 5 vehicle tabs.
- `src/components/shared/` — Reusable UI: `AsyncStates.jsx` (LoadingState/ErrorState/EmptyState), `FormInput.jsx`, `StatusPill.jsx`, `HealthBar.jsx`, `StatCard.jsx`, `FloatingAddButton.jsx`, `FilterChips.jsx`, `BarChart.jsx`, `ActionButton.jsx`, `DetailCard.jsx`, `DetailRow.jsx`, `TimelineItem.jsx`.
- `src/constants/enums.js` — All shared enums (FUEL_TYPES, SERVICE_TYPES, COMPONENT_TYPES, COMPONENT_STATES, vehicle spec types, PREDICTION_STATUS_ORDER).
- `src/constants/icons.js` — Emoji icon maps keyed by component/service type.
- `src/data/componentDefaults.js` — Default expected lifetime values per component type. Users never fill in expected lifetime — it is auto-filled from here on component creation.
- `src/styles/global.css` — CSS custom property tokens. `src/styles/pageStyles.js` + `src/components/shared/formStyles.js` — shared inline style objects.

### Auth & API

Cookie-based auth (no JWT). `src/api/axios.js` sets `withCredentials: true` on every request. 401 response interceptor redirects to `/login` on session expiry. Backend must have CORS configured for `http://localhost:5173`.

`GET /api/users/me` is called on every app load by `AuthContext` to determine session validity.

### Data fetching pattern

```jsx
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)  // initialise true — never call setLoading(true) inside useEffect body (causes cascade render warning)
const [error, setError] = useState(null)

useEffect(() => {
  getSomething()
    .then((res) => setData(res.data))
    .catch(() => setError('Human-readable message.'))
    .finally(() => setLoading(false))
}, [])

if (loading) return <LoadingState />
if (error)   return <ErrorState message={error} />
if (!data.length) return <EmptyState />
```

Use `Promise.allSettled()` (not `Promise.all`) for parallel fetches where individual failures should not crash the page.

### Form pattern

```jsx
const [form, setForm] = useState({ field: '' })
const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
```

### Routing rules

- `VehicleDetail.jsx` uses its own nested `<Routes>` for the 5 tabs. `TabBar` uses **absolute paths** to prevent URL stacking when switching tabs.
- The Overview tab uses `to: ''` (index route). The `end` prop is needed on NavLinks pointing to index routes.

### Styling

All component styles are **inline JavaScript objects** — no CSS modules, no Tailwind. Use CSS variables (`var(--token-name)`) always — never hardcode colours.

**Key design tokens:**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07080f` | Page background |
| `--surface` | `#0d0f1c` | Card / nav |
| `--surface2` | `#131628` | Input background |
| `--border` | `#252840` | Borders |
| `--accent` | `#6c63ff` | Indigo — primary, active nav, buttons |
| `--accent2` | `#4f8fff` | Blue — secondary |
| `--accent3` | `#a78bfa` | Soft purple — costs |
| `--accent4` | `#38bdf8` | Sky blue — teal |
| `--text` | `#e8eaf6` | Primary text |
| `--text2` | `#7b80a8` | Secondary / meta |
| `--green` | `#34d399` | Good / success |
| `--red` | `#f87171` | Critical / danger |
| `--orange` | `#fb923c` | Warning |
| `--yellow` | `#fbbf24` | Monitor |

**Fonts:** `Outfit` (display/body) + `JetBrains Mono` (labels, meta, UI chrome). Both loaded from Google Fonts.

## Component health logic

Health % = `Math.min(kmLifetimePercent, yearsLifetimePercent)` — worst-of-two rule. The backend health endpoint returns both values separately; the frontend always calculates displayed health this way.

| Status | Threshold | Colour |
|---|---|---|
| Critical | ≤ 15% | `var(--red)` |
| Warning | 16–30% | `var(--orange)` |
| Monitor | 31–50% | `var(--yellow)` |
| Good | 51–74% | `var(--green)` |
| Perfect | ≥ 75% | `var(--accent4)` |

## Navigation structure

**Bottom nav (5 items, always visible):** Home · Expenses · Car Park · Timeline · Profile

**Vehicle detail tabs (5 tabs):** Overview · Records · Components · Fuel · Predictions

**Critical rule:** Expenses and Timeline are global pages — never add them as vehicle sub-tabs.

## Backend API reference (key endpoints)

```
GET  /api/users/me                                      ← session check on app load
GET  /api/vehiclecomponents/vehicle/{id}/health         ← computed health data per component
GET  /api/vehicles/{id}/summary/costs?from=&to=         ← monthly breakdown [{month, maintenanceCost, fuelCost}]
GET  /api/vehicles/{id}/summary/timeline                ← events for one vehicle
GET  /api/users/{userId}/timeline                       ← cross-vehicle merged timeline
```

Health endpoint response shape requires: `componentId`, `componentType`, `vehicleComponentName`, `vehicleComponentBrand`, `currentState`, `kmLifetimePercent`, `yearsLifetimePercent`, `remainingKm`, `status`.

## PascalCase enum conversion

Enum values come from the backend as PascalCase strings. Convert for display:
```js
value.replace(/([A-Z])/g, ' $1').trim()  // 'OilChange' → 'Oil Change'
```

## ESLint notes

- `no-unused-vars` ignores uppercase variables — intentional for enum constants.
- Files that export both a React component and a non-component value trigger `react-refresh/only-export-components`. Solution: put non-component exports in a separate `.js` file (e.g. `formStyles.js`, `useAuth.js`).

## What NOT to build

- Expenses or Timeline as vehicle sub-tabs
- Light mode
- Forum, subscriptions, OBD2 integration, desktop app (out of scope for diploma)
- JWT auth (cookie-based only)
- Repository pattern (planned but not yet implemented — don't refactor unless asked)
- `UserDrivingProfile` entity on the frontend until the backend entity exists
