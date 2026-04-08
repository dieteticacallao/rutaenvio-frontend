# Testing

NEVER push business logic changes without testing first.

## Must test
- Geocoding: CABA (1417), GBA Norte (1653), GBA Sur (1878), Cordoba (5000), Rosario (2000)
- CP detection: verify detectProvince returns correct province
- CRUD: create, edit, delete with valid and invalid data
- Auth: protected endpoints reject without token

## Process
1. Create test-[feature].js with real Argentine data
2. Run with node test-[feature].js
3. All pass → delete test, commit
4. Any fail → fix, retest, then commit

## Pre-commit checklist
- No > < & in JSX text
- New Prisma models have table (prisma db push done)
- New fields saved in both create AND update
- List queries use select
- Endpoints filter by businessId

## Auto commit and push
Después de cada tarea completada y testeada, siempre hacer commit y push
automáticamente sin preguntar. Nunca dejar cambios sin commitear.
