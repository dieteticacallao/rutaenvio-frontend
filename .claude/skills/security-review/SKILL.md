---
name: security-review
description: Security audit for RutaEnvio. Use when reviewing code for vulnerabilities, before deployments, or when the user mentions security.
allowed-tools: Read, Grep, Glob
---
Analyze the codebase for security vulnerabilities:

1. Endpoints without auth middleware that should have it
2. Queries missing businessId filter (data leakage between tenants)
3. Exposed secrets or API keys in code (should be in env vars)
4. SQL injection risks (raw queries without parameterization)
5. XSS in frontend (unsanitized user input in JSX)
6. Missing input validation on POST/PUT endpoints
7. CORS misconfiguration
8. JWT token handling issues

Report findings with severity (critical/high/medium/low) and specific fix.
