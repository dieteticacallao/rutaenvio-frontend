# RutaEnvio - Delivery Tracking SaaS

## Commands
npm run dev              # Start backend dev server (port 3001)
npm run start            # Start production server
npx prisma db push       # Sync schema to DB (use public URL first)
npx prisma generate      # Generate Prisma client
npx expo start           # Start cadete app (deprecated, now web)

## Architecture
- Backend: Node.js + Express + Socket.IO, deployed on Railway
- Frontend: React 18 + Vite + Tailwind CSS, deployed on Vercel
- Database: Railway PostgreSQL (internal URL in prod, public URL for local prisma)
- ORM: Prisma v5.22
- Auth: JWT for admins, PIN for drivers
- Geocoding: Google Maps API (never Nominatim)
- Route optimization: OSRM (free, public)
- Maps: Leaflet + CartoDB Voyager tiles

## File structure
Backend: src/index.js (server), src/routes/ (all endpoints), src/middleware/auth.js, prisma/schema.prisma
Frontend: src/pages/ (Dashboard, Orders, RouteDistribution, Drivers, Settings, TrackingPage, OrderDetail, RouteView), src/components/Layout.jsx, src/lib/store.js

## Conventions
- All user-facing text in Spanish (Argentina)
- NEVER use > < & characters in JSX text content. Use words instead
- PrismaClient singleton from src/lib/prisma.js, never instantiate in routes
- Every query in listings uses select (only needed fields)
- Every endpoint filters by businessId (multi-tenant)
- Pagination mandatory on all list endpoints
- Google Maps Geocoding for all address lookups. If province is "Buenos Aires" use "Provincia de Buenos Aires" in query
- detectProvince(zipCode) maps Argentine postal codes to provinces

## Database
- Production: postgres.railway.internal:5432 (zero latency)
- Local dev: centerbeam.proxy.rlwy.net:19038
- No pgbouncer needed
- When running prisma db push locally: temporarily use public URL, then restore

## Watch out for
- PowerShell blocks npx on Windows. Always use Command Prompt (cmd)
- JSX text with > crashes the build. Use "mayor que" or rephrase
- New Prisma models need npx prisma db push or Railway gets P2021 errors
- Queries without select on listings cause slow responses
- zipCode field in Prisma is lowercase "zipcode", frontend sends "zipCode"
