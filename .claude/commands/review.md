---
name: review
description: Review current branch changes against main
---

1. Run `git log --oneline main..HEAD` to see commits
2. Run `git diff main...HEAD` to see all changes
3. Use the code-reviewer agent to review the diff
4. Summarize: what changed, potential risks, suggested improvements
