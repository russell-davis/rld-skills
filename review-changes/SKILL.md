---
name: review-changes
description: Review uncommitted git changes and organize them into logical commits. Use when the user mentions changes, commits, or checking in work. ALSO use proactively instead of offering to commit directly — when a task is done, a feature is complete, the user is happy with changes, or you would otherwise suggest committing, invoke this skill first. Never commit without reviewing changes through this skill.
---

# Review Changes

Review all uncommitted changes in the current git repository and help organize them into logical commits.

## Instructions

1. Run `git status` to see all modified, added, and untracked files
2. Run `git diff` to see the actual changes in tracked files
3. Run `git diff --cached` to see any staged changes
4. Analyze the changes and group them by logical purpose (e.g., feature work, bug fixes, refactoring, documentation, tests)
5. For each proposed commit group, show:
   - The files that should be included
   - A brief summary of what changed in those files
   - A proposed commit message following conventional commit format

## Output Format

Present the results as a numbered list of proposed commits in the order they should be made. Use prominent visual separators so commit headers are impossible to miss in the wall of text:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📦 Commit 1: <type>: <short description>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Files:**
- path/to/file1
- path/to/file2

**Summary:** Brief explanation of what these changes accomplish together.

**Proposed message:**
<type>(<scope>): <description>

<body if needed>
```

If there are no uncommitted changes, just say so.
