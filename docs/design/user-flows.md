# User Flows

## Primary flow — check a class batch

```mermaid
flowchart TD
    A[Home · Главная] -->|1 tap: continue| B[Active assessment · Проверка]
    B -->|1 tap: «Сканировать следующую»| C[Camera / scan alignment]
    C --> D{Frame stable + markers?}
    D -->|cancel| B
    D -->|yes| E[Local processing in memory]
    E --> F[Student + variant identified via QR]
    F -->|QR failed/ambiguous| F2[«Изменить ученика» fallback] --> F
    F --> G[Sheet result: tasks, points, %, grade]
    G --> H{Flagged tasks?}
    H -->|yes| I[Review queue — one decision, auto-advance 2 из 3]
    I --> G
    H -->|no / done| J[Save → SQLite + outbox, one tap]
    J -->|continue| B
    J -->|batch done| K[Class insight / analytics]
    K --> L[Export gradebook ≤2 taps]
```

Offline state: the entire A→J path runs offline. Outbox badge shows pending sync; sync happens on connectivity restore without blocking scanning.

## Secondary flow — create assessment

```mermaid
flowchart TD
    A[Задания tab] --> B{Source}
    B -->|ready test| C[Pick from bank]
    B -->|assemble| D[Search + add task cards]
    B -->|custom| E[Simple custom task]
    C & D & E --> F[Настройте тест: title, class, variants, grading scale]
    F --> G[Проверьте и создайте → printable batch]
    G --> H[Batch blanks PDF / print]
```

Cancellation: any step exits back to Задания with the draft preserved or discarded on confirmation.

## Secondary flow — analytics & insight

```mermaid
flowchart TD
    A[Главная / Ещё → Аналитика] --> B{Level}
    B --> C[Assessment: completion, avg, hardest task/topic]
    B --> D[Student: progress, topics to practise]
    B --> E[Class: avg score, topic to repeat]
    E --> F[One recommendation + evidence → Подобрать упражнения / Скрыть]
```

## Secondary flow — export

```mermaid
flowchart TD
    A[Completed assessment] --> B[Export gradebook sheet]
    B --> C{format}
    C -->|xlsx| D[Share/download]
    C -->|csv| D
```

## Rules

- Key actions ≤3 taps from home: continue checking (1), scan next (2), open key insight (1), export (≤2 after opening assessment).
- Each screen implements the states applicable to its data and actions; every async path has loading/error recovery, and network-dependent screens expose offline/sync-pending behavior where relevant; scan cancellations always return to a safe state with nothing half-saved.
- Review auto-advances after each decision; the teacher can always reopen and change an outcome before sync.
