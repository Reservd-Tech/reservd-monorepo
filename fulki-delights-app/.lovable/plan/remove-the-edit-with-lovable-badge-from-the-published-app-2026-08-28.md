# Remove the "Edit with Lovable" badge from the published app

## What your customers see

- The app is already published and public at reservd.store.
- The "Edit with Lovable" badge is currently enabled (`hide_badge: false`), so it shows on your published app.

## Plan

1. Hide the "Edit with Lovable" badge on the published deployment (requires a Pro plan or higher — if the plan doesn't allow it, the tool will say so).
2. Confirm to you so the next publish / current deployment serves a clean customer-facing app.

## Technical details

- Uses the publish settings badge toggle (`hide_badge: true`).
- No code changes needed — this is a hosting setting, not app code.
- The preview URL (id-preview--...lovable.app) always shows editing affordances for the project owner; customers should only ever get the reservd.store link.
