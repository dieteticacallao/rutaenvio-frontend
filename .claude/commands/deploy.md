---
description: Run full deploy checklist and push to production
---
## Pre-deploy checks

!`git diff --name-only HEAD`

Steps:
1. Run /project:review on all changes
2. If any .prisma files changed:
   - Read current DATABASE_URL from .env
   - Temporarily set it to the public Railway URL (port 19038)
   - Run npx prisma db push
   - Restore original DATABASE_URL
3. Verify no JSX files contain > < & in text content
4. git add .
5. git commit -m "descriptive message in spanish"
6. git push

Railway and Vercel auto-deploy on push. Takes 1-2 minutes.
