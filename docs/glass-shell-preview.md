# Glass material system — full rollout

The dashboard preview is now rolled out across the frontend. The preview-stage
attribute and its temporary opaque overrides have been removed. The ambient
background mounts once in the application entry, including public/authentication
pages. AppShell uses the route transition component again.

The approved sidebar colour is retained: forest dark rgba(27,53,39,.97), with a
restrained sage reflection at .035 opacity. Do not lighten it when adjusting
cards. The approved forest/sage/harvest backdrop strengths are .30/.46/.24.

## Material hierarchy

- Shell: a light ivory veil over the ambient gradients.
- Sidebar: deep forest glass; topbar: translucent ivory.
- Cards: approximately .66 white opacity with soft highlights.
- Metrics: a subtle white-to-warm-ivory gradient.
- Dense chart/data panels: approximately .86 white opacity; tables have a denser backing.
- Nested sections: warm ivory tint with no additional backdrop blur.
- Controls: approximately .90 white opacity, forest/sage focus treatment.
- Dialogs: approximately .95 ivory opacity over a blurred forest overlay.

Tokens, material utilities, responsive blur, unsupported-browser fallbacks and
reduced-motion rules are centralized in `frontend/src/index.css`. Avoid opaque
page-specific background utilities on shared Card components, or stacking blur
on nested sections. Retain semantic status colours.

## Interactions

Authenticated route changes use native view transitions where available, with
CSS entry animation as fallback. Navigation has a shared sliding active pill.
Ambient drift is slow and disabled on mobile. Reduced-motion preferences disable
decorative motion. Shared dialogs retain content for the closing animation,
restore focus, trap keyboard focus and lock background scrolling while open.
Shipment loading/checkpoint, carrier onboarding, user editing and sensor-alert
modal shells now use this shared dialog implementation; form handlers remain intact.

## Verification

Production build and 49 frontend tests pass. Browser checks used real frontend
components with isolated sample API responses: dashboard, analytics, route
navigation, carrier dialog opening/cancel/Escape/focus restoration, and the
carrier form at mobile width. No console errors were observed. Temporary QA
fixtures were removed. Live backend workflows were not exercised; visual QA does
not establish end-to-end backend correctness.

## Final plan audit

The 45 page components use the shared material system or explicit semantic
surfaces. No preview-stage overrides or page-specific fixed modal wrappers remain.
The approved dark forest shade is unchanged. The final audit also completed:

- Arrow-key, Home/End and disabled-item handling for shared tabs, with linked
  tab/panel labels and visible keyboard focus.
- Scroll-lock cleanup when an open mobile drawer crosses the desktop breakpoint.
- Navigation fallback if native view-transition creation throws.
- Suppression of duplicate legacy page-entry animations beneath route motion.
- Opaque nested-panel fallback where backdrop filtering is unsupported.

Regression tests cover the new keyboard, resize and transition-failure behavior.
The visual implementation is complete; the verification limits above still apply.
