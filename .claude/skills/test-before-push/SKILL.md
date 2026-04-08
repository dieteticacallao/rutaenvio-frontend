---
name: test-before-push
description: Auto-test business logic before pushing. Use whenever geocoding, route distribution, CP detection, or CRUD logic is modified.
allowed-tools: Read, Write, Bash, Grep, Glob
---
Before pushing, create and run tests:

1. Identify what business logic changed (check git diff)
2. Create test-[feature].js with real Argentine test cases:
   - Geocoding: CABA, Villa Ballester, Quilmes, Cordoba, Rosario
   - CP detection: 1417→CABA, 1653→Buenos Aires, 5000→Cordoba
   - CRUD: valid data, missing required fields, invalid data
3. Run the test with node test-[feature].js
4. If any test fails: fix the code, rerun
5. If all pass: delete the test file, proceed to commit

NEVER skip this step for business logic changes.
