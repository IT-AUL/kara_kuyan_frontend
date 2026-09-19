# Design Direction

## Reference

- Figma: `https://www.figma.com/design/z6hxlS5wVdmPLsMlb2lha7/Кара-Куян?node-id=0-1` — a reference, not a pixel-locked spec. Product workflow, accessibility, and Android conventions take precedence over the mock.

## Direction

**Calm premium teacher instrument.** Dark-first, practical, restrained; the product should feel like a precise tool, not a dashboard or a game.

## Rules

- **Android-first:** system bars, edge-to-edge, predictive back, Android status chrome — never iOS chrome.
- **Palette:** keep the dark green palette (see tokens below) but express it as **semantic tokens** (surface/primary/text/status), not raw hex sprinkled in components.
- **Typography:** replace Figtree — its canonical release is Latin-focused and cannot guarantee Tatar Cyrillic coverage. Use **Onest only after a cmap test** confirms Ә/Ө/Ү/Җ/Ң/Һ and the full product corpus; **Noto Sans** is the tested fallback. (Onest's repo lists Tatar support, but bundled files must be verified.)
- **Density:** fewer cards, fewer borders, more negative space; one dominant CTA and one main decision per screen; secondary actions as text actions/overflow/bottom sheets.
- **Motion:** restrained and purposeful (native-thread via Reanimated 4); respect reduced-motion settings.
- **Signature moment:** the scan-alignment experience (frame → markers lock → process → result) is the product's distinctive interaction — invest polish there.
- **No generic kit:** no React Native Paper / Material kits / dynamic color palette. Custom semantic tokens + product components.

## Palette (token seed)

| Role | Hex |
|---|---|
| background | #0B0F0D |
| surface | #141A17 |
| surface-2 | #1B241F |
| primary | #25E38A |
| primary-deep | #0D8F54 |
| success-soft | #A7F3C8 |
| text | #F4F8F5 |
| text-muted | #99AAA1 |
| divider | #2A352E |
| warning (review) | #F5B942 |
| error (confirmed) | #FF6868 |

Status semantics: green = action/ready/correct; amber = review/uncertain; red = confirmed errors only. Statuses must also carry non-color cues (icon/label).

## Figma reference (16 top-level frames)

`home`, `check-active-assessment`, `camera-scanner`, `local-processing`, `student-identified`, `assessment-result`, `task-review`, `assignments-library`, `test-constructor-step1`, `test-constructor-step2`, `grading-scale-sheet`, `assignment-summary`, `analytics-overview`, `student-profile`, `classes-detail`, `gradebook-export-sheet`.

Treat as navigation map only — do not reproduce generated code or pixel values.

## Adopt-on-evidence (not defaults)

Unistyles 3 (requires `react-native-nitro-modules` + entry config — verify SDK build first), Gorhom Bottom Sheet, FlashList, Skia, a chart library, Sentry (PII-scrubbed). Default: tokenized React Native StyleSheet and native/modal primitives.
