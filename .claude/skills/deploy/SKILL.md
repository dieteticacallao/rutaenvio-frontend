---
name: deploy
description: Full deploy workflow. Use when the user says "deployá", "pusheá", "subilo", "mandalo a produccion", or after finishing a feature.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---
Execute the full deploy pipeline:

1. Run /project:review to check for issues
2. Fix any issues found
3. If schema.prisma was modified:
   - Swap DATABASE_URL to public Railway URL in .env
   - Run npx prisma db push
   - Restore DATABASE_URL in .env
4. git add .
5. git commit with descriptive Spanish message
6. git push

Inform that Railway and Vercel auto-deploy in 1-2 minutes.
