# Design Quality Bar — Measurable Android Gates

These are gates, not aspirations. Each must be verifiable before a slice is called done.

## Touch & layout

- All interactive targets ≥ **48 dp**; primary buttons 52–56 dp high.
- Android system chrome only: edge-to-edge, correct status/nav bar contrast, predictive back — no iOS-style chrome.
- One dominant CTA and one main decision per screen; secondary actions via text actions / overflow / bottom sheets.

## Color & status

- Text contrast ≥ WCAG AA on all surfaces.
- Statuses (correct / error / review / pending / synced) are **never color-only** — each carries an icon or label.
- Red reserved for confirmed errors; amber for review; green for action/ready/correct.

## Accessibility

- Interactive elements expose `accessibilityLabel`/role; a **physical-device TalkBack pass** on the core scan→review→save flow is required.
- Reduced-motion setting honored; no information conveyed by animation alone.

## Typography & copy

- Font cmap test passes for Ә/Ө/Ү/Җ/Ң/Һ and the full product corpus before Onest ships; Noto Sans fallback otherwise.
- Real Russian UI copy and Tatar educational content everywhere — no lorem, no placeholder strings, no mixed-language chrome.

## Motion & performance

- 60 fps target for scan-alignment, transitions, and list scrolling on the reference device; no janky JS-driven layout animation for hot paths.

## States

- Each screen implements the states applicable to its data and actions; every async path has loading/error recovery, and network-dependent screens expose offline/sync-pending behavior where relevant. Batch checking must never re-ask for class/test.

## Review coverage

- Storybook: complex product components and screens cover their **applicable** states (loading/error/empty/offline/flagged/overridden where relevant); primitives cover interaction, disabled, and accessibility variants. No every-state-for-every-component busywork.
- Figma is adapted, not pixel-locked: match intent and hierarchy; deviations need a reason noted in the change review.
