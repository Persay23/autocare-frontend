# AutoCare — Frontend

Mobile-first vehicle maintenance tracking SPA built as a diploma project. Lets users manage their vehicles, log service records and fuel refills, track component health and general expenses, run AI-powered diagnostics, and receive personalised service predictions — all from a phone-sized interface.

**Backend repo:** [VehicleMaintenance](https://github.com/Persay23/VehicleMaintenance)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Routing | React Router v7 |
| State | Zustand (per-feature stores with TTL cache) |
| HTTP | Axios (shared instance, `withCredentials`) |
| Icons | Material UI icons |
| Fonts | Outfit + JetBrains Mono (Google Fonts) |
| Linting | ESLint |

---

## Features

- Cookie-based auth — register, login, persistent session check on every load
- Vehicle list (Car Park) with per-vehicle health overview cards
- Per-vehicle tabs: Overview · Records · Components · Fuel · Predictions
- Maintenance records with full cost breakdown and per-component line items
- Component health tracking — progress bar driven by mileage and age (worst-of-two rule), powered by the same math as the backend's `ComponentHealthCalculator`
- Component management via a modal (detail, edit, create) with multi-step create wizard, service history, AI advice, warranty tracking, and next-service estimates
- Fuel refill log with cost-per-litre calculation, grouped by month
- AI-powered per-component service predictions with confidence score and status management (Active / Completed / Ignored)
- AI symptom diagnosis — enter a symptom, receive structured likely causes, urgency rating, and recommended actions
- Vehicle-level AI suggestions generated automatically after each service record
- General Expenses page — recurring and one-off costs (insurance, tax, fines, etc.) managed inline via modal, with 6-month bar chart, by-category and by-vehicle breakdown, and month-over-month comparison
- General expense create/edit/detail flow handled entirely by `ExpenseModal` (no separate pages)
- Fuel entry create/edit/detail handled by `FuelEntryModal`
- Driving profile survey — annual km, trip distances, highway ratio, driving style — used to improve AI estimates
- Quick Setup Sheet — guided first-run onboarding for new vehicles
- Multi-currency support with live conversion (PLN, EUR, USD, GBP)
- Cross-vehicle event timeline
- Fully dark-themed UI capped at 430 px — designed and tested as a mobile web app

---

## Project Structure

```
app/
├── features/          # Domain slices — each owns its API module and Zustand store
│   ├── ai/            # diagnoseVehicle, getDiagnosisHistory
│   ├── auth/          # login, register, session refresh, authStore
│   ├── components/    # CRUD + history API
│   ├── currency/      # currencyStore — selected currency + PLN conversion helpers
│   ├── drivingProfile/
│   ├── expenses/      # expensesStore — cost summaries + general expenses
│   ├── fuel/
│   ├── notifications/ # notificationsStore
│   ├── predictions/   # predictionsStore keyed by vehicleId
│   ├── records/       # componentEntry.ts — form shape for record component rows
│   ├── timeline/      # timelineStore
│   ├── users/
│   └── vehicles/      # vehiclesStore — vehicle list with fetch/invalidate
├── lib/
│   ├── healthState.ts         # single source of truth: colorFromPct, computeComponentMeasurements
│   ├── componentTemplates.ts  # default lifetime / warranty values per component type
│   ├── dedup.ts               # request deduplication for concurrent mounts
│   ├── enums.ts               # shared enum value lists (EXPENSE_CATEGORIES, FUEL_TYPES, …)
│   ├── formatters.ts          # formatEnumLabel, date helpers
│   ├── icons.ts               # component type → MUI icon map
│   ├── mileageBounds.ts       # mileage validation against sibling events
│   └── types.ts               # all shared TypeScript interfaces
├── routes/
│   ├── auth/          # login.tsx, register.tsx
│   ├── components/    # list.tsx (ComponentModal handles detail/edit/create)
│   ├── fuel/          # list.tsx (FuelEntryModal handles detail/edit/create)
│   ├── global/
│   │   ├── expenses/  # list.tsx (ExpenseModal), detail.tsx, create.tsx, edit.tsx
│   │   ├── home.tsx   # dashboard with alert summary, recent activity, quick actions
│   │   ├── carpark.tsx
│   │   ├── timeline.tsx
│   │   └── profile.tsx
│   ├── predictions/   # list.tsx
│   ├── records/       # list.tsx, detail.tsx, create.tsx, edit.tsx, components.tsx
│   └── vehicles/      # layout.tsx, overview.tsx, create.tsx, edit.tsx, diagnose.tsx
├── styles/
│   ├── global.css     # CSS custom properties (design tokens)
│   └── pageStyles.ts  # shared inline style constants
└── ui/
    ├── layout/
    │   ├── PageShell.tsx
    │   ├── BottomNav.tsx
    │   ├── TabBar.tsx
    │   ├── SideNav.tsx
    │   └── ProtectedRoute.tsx
    ├── ComponentModal.tsx      # component detail / edit / create (multi-step wizard)
    ├── ExpenseModal.tsx        # expense detail / edit / create
    ├── FuelEntryModal.tsx      # fuel entry detail / edit / create
    ├── PredictionModal.tsx     # prediction detail
    ├── RecordModal.tsx
    ├── DrivingSurveySheet.tsx  # driving profile bottom sheet
    ├── QuickSetupSheet.tsx     # first-run onboarding sheet
    ├── SmartFillButton.tsx     # AI-assisted field population
    ├── BarChart.tsx
    ├── HealthBar.tsx
    ├── FloatingAddButton.tsx
    └── …
```

---

## Design System

All styles are **inline JavaScript objects** — no CSS modules or Tailwind. Colors are always referenced through CSS custom properties defined in `app/styles/global.css`.

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#07080f` | Page background |
| `--surface` | `#0d0f1c` | Cards, nav |
| `--surface2` | `#131628` | Input backgrounds, secondary cards |
| `--surface3` | `#191c32` | Tertiary surfaces |
| `--border` | `#252840` | Borders |
| `--border2` | `#1c1f35` | Subtle dividers |
| `--accent` | `#6c63ff` | Primary — buttons, active nav |
| `--accent2` | `#4f8fff` | Secondary blue |
| `--accent3` | `#a78bfa` | Soft purple — maintenance costs |
| `--accent4` | `#38bdf8` | Cyan — fuel, recurring |
| `--text` | `#e8eaf6` | Primary text |
| `--text2` | `#7b80a8` | Secondary / meta |
| `--text3` | `#4a4e6b` | Tertiary / labels |
| `--green` | `#34d399` | Good / success |
| `--red` | `#f87171` | Critical / danger |
| `--orange` | `#fb923c` | Repair / warning |
| `--yellow` | `#fbbf24` | Normal |

### Component Health States

| State | Remaining health | Color token |
|---|---|---|
| Perfect | > 75% | `--accent4` (cyan) |
| Good | 51 – 75% | `--green` |
| Normal | 31 – 50% | `--yellow` |
| Repair | 16 – 30% | `--orange` |
| Critical | ≤ 15% | `--red` |

`app/lib/healthState.ts` is the single source of truth for these rules. `healthPctToState(pct)` maps a percentage to a state label; `colorFromPct(pct)` returns the CSS token; `computeComponentMeasurements(component)` derives `kmPercent`, `yearsPercent`, and `healthPct` from a component object. No other file re-implements this logic.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Backend running at `https://localhost:7235` (see [backend repo](https://github.com/Persay23/VehicleMaintenance))

### Setup

```bash
git clone https://github.com/Persay23/autocare-frontend.git
cd autocare-frontend
npm install
```

Copy the environment file and adjust if needed:

```bash
cp .env.example .env
```

`.env.example`:
```
VITE_API_URL=https://localhost:7235
```

### Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run lint      # ESLint check
npm run preview   # Serve the production build locally
```

---

## API Connection

A shared Axios instance (`app/http/axios.ts`) sets `baseURL` from `VITE_API_URL` and `withCredentials: true` on every request. A 401 response interceptor redirects to `/login` automatically. Each domain's API functions live in `app/features/<domain>/api.ts` and are called only through their respective store or directly by modals.

---

## State Management

Each domain feature owns a **Zustand store** with a TTL-based cache. Components call the store's `fetch` action on mount — if data was fetched within the TTL window, the network call is skipped.

| Store | Contents |
|---|---|
| `vehiclesStore` | Vehicle list + selected vehicle; invalidated on any vehicle write |
| `expensesStore` | Monthly cost summaries (keyed by vehicleId) + flat general expense list |
| `predictionsStore` | Prediction lists keyed by vehicleId |
| `timelineStore` | Cross-vehicle event timeline; invalidated on fuel/record writes |
| `currencyStore` | Selected currency + `formatMoney` / `toPLN` helpers |
| `drivingProfileStore` | Driving profile for the current user |
| `notificationsStore` | In-app notification count and list |
| `authStore` | Current user identity; polled every 60 s against `/api/users/me` |

Request deduplication (`app/lib/dedup.ts`) prevents multiple concurrent fetches for the same key when several components mount simultaneously.

---

## Modal Pattern

Detail/edit/create flows for components, fuel entries, and general expenses are handled by full-screen modals rather than separate routes. Each modal:

- Accepts an ID (`null` = create mode) plus `onClose` and `onSaved` callbacks
- Manages its own loading, saving, and error state
- Opens over the current page with a `position: fixed` backdrop
- Locks background scroll while open
- On save: calls `invalidate()` on the relevant store so the list re-fetches

This avoids navigation stack noise for actions that users perform frequently mid-session.

---

## License

Created as a diploma submission. Educational use only.
