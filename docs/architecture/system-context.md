# System Context

## Context / data-flow

```mermaid
flowchart LR
    Teacher([Teacher]) -->|uses| App[Expo app UI]
    App -->|requests rosters, PDFs, offline bundles, analytics, exports| Backend[(Backend API)]
    Backend -->|rosters, printable PDFs, offline bundles, analytics, exports| App
    Teacher -->|prints received PDF| Paper[/Paper worksheet/]
    Student([Student]) -->|handwrites answers| Paper
    Paper -->|camera frame, pixels stay in native process memory| Pipeline

    subgraph Phone[Teacher's Android phone]
        App --> Pipeline
        Pipeline[Native pipeline: ArUco rectification, QR decode, cell crops, ONNX inference] -->|structured evidence| Domain[App/domain: answer comparison, teacher review]
        Domain -->|saved submission + outbox entry| DB[(expo-sqlite: source of truth)]
        App --> Domain
    end

    DB -->|structured submissions only, batch sync| Backend
    Backend -->|gradebook xlsx/csv, PDF| Export[/Export/]
    Export --> Teacher
```

## Trust boundaries

- **Zero-photo boundary:** pixel data — camera frames and derived crops — is confined to native process memory inside the pipeline and discarded when processing completes. No image data crosses into JS, SQLite, the filesystem, the network, logs, crash reports, or exports.
- **Sync payload:** ~1–2 KB JSON per sheet — letters, statuses, confidences, scores, overrides. Never images.
- **Backend** owns rosters, printable PDFs, offline bundles, historical analytics, and gradebook exports.
- **Device** owns the camera pipeline, OCR, answer comparison, teacher review, and durable unsynced state.
