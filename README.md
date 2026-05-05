# AutoCare — Frontend

Mobile-first vehicle maintenance tracking SPA built as a diploma project. Lets users manage their vehicles, log service records and fuel refills, monitor component health, and view AI-powered service predictions — all from a phone-sized interface.

**Backend repo:** [VehicleMaintenance](https://github.com/Persay23/VehicleMaintenance)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Routing | React Router v7 |
| State | Zustand (per-feature stores) |
| HTTP | Axios (shared instance, `withCredentials`) |
| Icons | Material UI icons |
| Fonts | Outfit + JetBrains Mono (Google Fonts) |
| Linting | ESLint |

---

## Features

- Cookie-based auth — register, login, session check on every load
- Vehicle list with health overview cards
- Per-vehicle tabs: Overview · Records · Components · Fuel · Predictions
- Maintenance records with cost breakdown and component linking
- Component health tracking — progress bar driven by mileage and age (worst-of-two rule)
- Fuel refill log with cost-per-litre calculation
- Service predictions with AI confidence score and status management (Active / Completed / Ignored)
- Global Expenses page with 6-month bar chart, by-category and by-vehicle breakdown views, month-over-month comparison
- Cross-vehicle timeline
- Driving profile analysis and smart mileage suggestions
- Fully dark-themed, capped at 430 px — designed and tested as a mobile web app

---

## Project Structure

```
app/
├── features/          # Domain slices — each owns its API module + Zustand store
│   ├── auth/
│   ├── expenses/
│   ├── fuel/
│   ├── predictions/
│   ├── records/
│   └── vehicles/
├── lib/               # Shared utilities (types, enums, formatters, dedup, theme…)
├── routes/            # One directory per feature, one file per page
│   ├── auth/          # login, register
│   ├── components/    # list, detail, create, edit
│   ├── fuel/          # list, detail, create, edit
│   ├── global/        # home, expenses, timeline, carpark, profile
│   ├── predictions/   # list, detail
│   ├── records/       # list, detail, create, edit
│   └── vehicles/      # layout, overview, create
├── styles/            # global.css (CSS custom properties) + pageStyles.ts
└── ui/                # Reusable components
    ├── layout/        # PageShell, BottomNav, TabBar, ProtectedRoute
    ├── BarChart.tsx
    ├── FormInput.tsx
    ├── StatusPill.tsx
    ├── TimelineItem.tsx
    └── …
```

---

## Design System

All styles are **inline JavaScript objects** — no CSS modules or Tailwind. Colors are always referenced through CSS custom properties defined in `app/styles/global.css`.

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#07080f` | Page background |
| `--surface` | `#0d0f1c` | Cards, nav |
| `--surface2` | `#131628` | Input backgrounds |
| `--border` | `#252840` | Borders |
| `--accent` | `#6c63ff` | Primary — buttons, active nav |
| `--accent2` | `#4f8fff` | Secondary blue |
| `--accent3` | `#a78bfa` | Soft purple — maintenance costs |
| `--accent4` | `#38bdf8` | Cyan — fuel, general |
| `--text` | `#e8eaf6` | Primary text |
| `--text2` | `#7b80a8` | Secondary / meta |
| `--green` | `#34d399` | Good / success |
| `--red` | `#f87171` | Critical / danger |
| `--orange` | `#fb923c` | Warning / fuel |
| `--yellow` | `#fbbf24` | Monitor |

Component health thresholds: Critical ≤ 15% · Warning 16–30% · Monitor 31–50% · Good 51–74% · Perfect ≥ 75%

---

## Getting Started

### Prerequisites

- Node.js 20+
- Backend running at `https://localhost:7235` (see backend repo)

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

The app talks exclusively to the ASP.NET Core backend. A shared Axios instance (in `app/features/*/api.ts`) sets `baseURL` from `VITE_API_URL` and `withCredentials: true` on every request. A 401 response interceptor redirects to `/login` automatically.

The backend must have CORS configured to allow `http://localhost:5173`.

---

## State Management

Each domain feature owns a **Zustand store** that caches fetched data and exposes a `fetch` / `fetchAll` action. Components call the store action on mount — if the data is already cached the network call is skipped.

```
vehiclesStore   — vehicle list + loading flag
expensesStore   — monthly cost summaries keyed by vehicleId
predictionsStore — predictions keyed by vehicleId
```

Auth state lives in a dedicated auth store (`features/auth/authStore.ts`) and is checked against the backend every 60 seconds.

---

## License

Created as a diploma submission. Educational use only.
