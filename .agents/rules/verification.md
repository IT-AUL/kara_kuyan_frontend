# Verification & Evidence

## Never claim without evidence

- Never claim tests pass unless you ran them and pasted the output.
- Never claim a build succeeds unless you ran the build command.
- Report evidence (command + output) for every completion claim.
- No fabricated commands or outputs.

## Core verification commands

```bash
pnpm run lint          # ESLint
pnpm run typecheck     # tsc --noEmit
pnpm test --runInBand  # Jest unit tests
pnpm run check-deps    # expo install --check
pnpm run doctor        # expo-doctor
```

## Gate evidence

A gate passes only with recorded evidence (command + output, capture, or reviewed artifact). Claims without evidence are not completions.

## Device claims

- No unverified latency numbers — only instrumented device runs count.
- Emulator results never substitute for the physical-device gate.
- External benchmark claims (e.g., "12 ms OCR") are rejected as evidence.
