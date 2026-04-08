---
paths:
  - "src/routes/**/*.js"
  - "src/middleware/**/*.js"
---
# API Conventions

## Geocoding
- Google Maps Geocoding API only. NEVER Nominatim
- Query: address + ", " + city + ", " + geoProvince + ", Argentina"
- If province is "Buenos Aires" → use "Provincia de Buenos Aires"
- Fallback: retry without province if no results

## CP Detection
- detectProvince(zipCode) maps CP to province
- 1000-1499=CABA, 1500-1999=Buenos Aires, 2000-2999=Santa Fe, 5000-5399=Cordoba
- Always run on create/edit if zipCode present

## Database
- Railway PostgreSQL internal (prod), public URL (local prisma push)
- No pgbouncer
- Prisma singleton, select on listings, paginate everything

## Multi-tenant
- EVERY query must filter by businessId from req.businessId
- Public routes only: /api/tracking/:code, /api/drivers/route-link/:token
