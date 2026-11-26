---
name: pr-summary
description: Generate a pull request summary from the current branch diff against
main.
Use when the user asks for a PR description, wants to review what changed,
or needs a commit message for a multi-commit branch.
allowed-tools: Bash(git *)
---
## Branch information
Current branch: !`git branch --show-current`
Commits ahead of main: !`git log main..HEAD --oneline`
## Full diff against main
!`git diff main...HEAD`
## Changed files
!`git diff main...HEAD --name-status`## Instructions
Write a pull request description with the following sections:
### Summary
Two to three sentences describing what this branch does and why.
### Changes
A bullet list of the specific code changes. Group by file or feature area.
Be concrete: mention function names, endpoints, or schema fields.
### Testing
Describe how the changes were tested or what tests were added.
### Risks
List any concerns: missing error handling, untested edge cases,
breaking changes, performance implications, or security considerations.
If there are no risks, write: No known risks.
Keep the whole description under 400 words.