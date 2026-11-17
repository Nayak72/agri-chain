# Background and shell review

Current stage: preview on the authenticated `/dashboard` route only.

The document's `data-visual-stage="shell-preview"` attribute holds back the
previous application-wide translucent card treatments. Cards, metrics, inputs,
and dense data surfaces are opaque; inset sections retain warm ivory contrast.
The dashboard alone mounts the ambient background and enables translucent
forest navigation and an ivory topbar. Other routes have opaque shell surfaces.
The backdrop is static. AppShell uses the regular router Outlet, keeping page
motion out of this material review. Existing keyboard and dialog behavior remains.

Calibration is centralized in the review-stage section of `frontend/src/index.css`:
forest, sage, and harvest background strengths; shell veil; sidebar tint; and
topbar opacity. Smaller screens use lighter blur. Unsupported browsers receive
opaque navigation surfaces.

Review the background visibility, sidebar contrast, and topbar translucency
before extending the treatment to cards. Next, calibrate one card, one data
panel, a nested section, controls, and a dialog on a representative page. Only
then resume the wider material rollout and motion calibration. Do not merely
remove the stage attribute: background mounting and route motion are deliberately
scoped separately.

Validation: production build; 46 frontend tests; desktop and mobile visual checks
using an isolated fixture with sample responses; no browser console errors.
Verified that navigation away from the dashboard removes the ambient layer and
sidebar blur. The temporary QA fixture was removed. Live backend workflows were
not exercised for this presentation-only change.
