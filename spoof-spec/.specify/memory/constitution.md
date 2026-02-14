<!--
Sync Impact Report
- Version change: template placeholder -> 1.0.0
- Modified principles: N/A (template placeholders replaced)
- Added sections: Core Principles (3), Security Requirements, Development Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ⚠ .specify/templates/commands/*.md (directory not present)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): original adoption date not found in repo
-->
# Spooftify Constitution

## Core Principles

### I. Comprehensive Testing & PR Gates
Testing MUST cover all primary functions of the application. Every PR MUST run the
full test suite via GitHub Actions, and merges are blocked on failures or missing
tests for new/changed primary behavior.

### II. Secret Hygiene & Env File Safety
Private keys and secrets MUST never be committed, logged, or shared. Use `.envrc`
for non-secret defaults and `.envrc.local` for secrets; `.envrc.local` MUST be
gitignored and never referenced in documentation or logs.

### III. MVP-Only Simplicity
The project MUST stay MVP-focused: avoid production-scale plans, premature
optimization, and unnecessary complexity. Anything beyond MVP scope requires an
explicit, written justification in the plan.

## Security Requirements

- Secrets MUST be stored only in local env files or approved secret stores.
- `.envrc.local` MUST remain untracked; `.envrc` MUST not contain private keys.
- Logs and error messages MUST redact or avoid secrets entirely.
- If a secret is exposed, rotate it immediately and document the incident.

## Development Workflow & Quality Gates

- GitHub Actions MUST run the full test suite on every PR.
- Primary user flows MUST have automated tests (unit/integration/contract as
  appropriate).
- Any change to primary behavior MUST include test updates in the same PR.
- Exceptions require documented approval in the implementation plan.

## Governance

- This constitution is the highest authority; all specs, plans, and tasks MUST
  conform.
- Amendments require a PR updating this file and any dependent templates, plus a
  rationale in the PR description.
- Versioning follows semantic versioning: MAJOR for breaking governance changes,
  MINOR for new principles or material expansions, PATCH for clarifications.
- Compliance is checked during planning (Constitution Check) and again during PR
  review; exceptions must be recorded with a justification.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not found in repo | **Last Amended**: 2026-02-14
