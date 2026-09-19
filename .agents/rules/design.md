# Design Rules

## Direction

Calm premium teacher instrument. Dark-first, practical, restrained — precise tool, not a dashboard or a game.

## Canonical sources

- `docs/design/design-direction.md` — palette, typography, rules, Figma reference
- `docs/design/quality-bar.md` — measurable Android gates
- `docs/design/user-flows.md` — primary and secondary user flows

## Android-first

- System bars, edge-to-edge, predictive back, Android status chrome.
- Never iOS-style chrome.

## Palette & tokens

- Dark green palette expressed as **semantic tokens** (surface/primary/text/status), not raw hex.
- See `docs/design/design-direction.md` for the token seed table.
- Status semantics: green = action/ready/correct; amber = review/uncertain; red = confirmed errors only.
- Statuses must carry non-color cues (icon/label) — never color-only.

## Typography

- **Onest** approved for current UI — bundled 400/500/600/700 TTFs verified for Tatar glyphs.
- **Noto Sans** is the tested fallback.
- No Figtree (lacks guaranteed Tatar Cyrillic).

## Quality gates

- All interactive targets ≥ 48 dp; primary buttons 52–56 dp.
- Text contrast ≥ WCAG AA on all surfaces.
- `accessibilityLabel`/role on interactive elements; TalkBack pass required.
- Reduced-motion setting honored.
- Real Russian UI copy and Tatar educational content — no lorem, no placeholder strings.
- 60 fps scan-alignment, transitions, list scrolling on reference device.

## Figma

- 16 top-level frames documented in `docs/design/design-direction.md`.
- Treat as navigation map — match intent and hierarchy; deviations need a reason.
- Never reproduce generated code or pixel values from Figma.
