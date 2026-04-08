---
description: Investigate and fix a reported bug
argument-hint: [description of the bug]
---
The user reported this issue: $ARGUMENTS

## Current state of the codebase

!`git status`

Steps:
1. Identify which files are likely involved
2. Read them and find the root cause
3. If it's a backend issue, check Railway deploy logs pattern
4. Create a test that reproduces the bug
5. Fix the bug
6. Run the test to verify
7. Run /project:review before committing
8. Commit and push
