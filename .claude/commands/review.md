---
description: Review current changes for bugs, security issues, and RutaEnvio conventions before pushing
---
## Changes to review

!`git diff --name-only HEAD`

## Detailed diff

!`git diff HEAD`

Review the above changes for:
1. JSX text containing > < & characters (must use words instead)
2. Prisma queries missing select in listings
3. Endpoints missing businessId filter
4. Missing error handling (try/catch)
5. Console.log left for debugging (remove unless geocoding)
6. New Prisma models without corresponding npx prisma db push
7. Security: exposed secrets, missing auth middleware on protected routes

Give specific feedback per file with line numbers.
