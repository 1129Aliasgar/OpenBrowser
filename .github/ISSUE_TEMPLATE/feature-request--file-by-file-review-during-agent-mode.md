---
name: 'Feature Request: File-by-File Review During Agent Mode'
about: Feature Implementation
title: Feature
labels: 'enhancement'
assignees: 1129Aliasgar

---

## Problem

AI may propose changes across multiple files, but users may only want to accept a subset of them.

For example:

```text
✓ src/routes/user.ts
✓ src/server.ts
✓ package.json
✓ README.md
```

A user might want to:

* Accept `user.ts`
* Reject `package.json`
* Skip `README.md`
* Accept `server.ts`

Today, this isn't possible without accepting or rejecting everything.

## Proposed Solution

Introduce an interactive **file-by-file review mode** after the diff preview.

For each modified file, present the following options:

```text
src/routes/user.ts

[A] Accept
[R] Reject
[S] Skip
[V] View Diff
```

After reviewing all files, display a summary:

```text
Accepted (2)
✓ src/routes/user.ts
✓ src/server.ts

Rejected (1)
✗ package.json

Skipped (1)
• README.md
```

Only accepted files should be written to disk.

## Benefits

* Better control over AI-generated changes.
* Safer workflow for large edits.
* Easier review of experimental changes.
* Improves developer confidence before applying modifications.

## Possible Future Enhancements

* Accept or reject individual operations within a file.
* Keyboard shortcuts (`a`, `r`, `s`, `v`).
* Bulk actions (Accept Remaining / Reject Remaining).
* Navigate between files using arrow keys.
* Side-by-side diff viewer.

## Additional Context

This feature would make OpenBrowser's review experience closer to professional AI coding tools while maintaining a local-first and user-controlled workflow.
