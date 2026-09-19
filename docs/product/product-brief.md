# Kara Kuyan — Product, Concept and Design Brief for an Agent

## 1. Product in one sentence

**Kara Kuyan** is a mobile application for Tatar language teachers that helps them create and print full paper-based assessments, check completed worksheets by phone, review results, understand learning patterns, and act on them.

The product follows a simple teacher workflow:

> **Prepare → Print → Scan → Review → Grade → Understand → Act**

Kara Kuyan is being designed as a focused, polished hackathon MVP. It should feel like a calm and practical teacher companion, not like a broad school CRM, a generic OCR utility, or a complex analytics platform.

---

## 2. Problem

Teachers of the Tatar language spend significant time on repetitive work:

1. Finding or preparing suitable grammar exercises.
2. Building tests and printing worksheets.
3. Checking paper answers manually.
4. Calculating scores and grades.
5. Understanding common class mistakes and deciding what to repeat next.
6. Transferring results into a gradebook.

Existing educational products often focus on Russian, mathematics, or English. Tools for Tatar language learning tend to be aimed at students, dictionaries, or self-study. Kara Kuyan is specifically designed for the teacher’s assessment workflow.

The product supports Tatar language content and its special Cyrillic letters, including:

- Ә ә
- Ө ө
- Ү ү
- Җ җ
- Ң ң
- Һ һ

---

## 3. Core concept

Kara Kuyan is not an application about isolated letter recognition.

It is a product for creating, checking, grading, and analysing **complete Tatar language tests and grammar exercises**.

A teacher works with full educational tasks, for example:

> Куегыз сүзне юнәлеш килешендә: китап →
>
> Expected answer: КИТАПКА

> Куегыз сүзне чыгыш килешендә: өстәл →
>
> Expected answer: ӨСТӘЛДӘН

> Сүзгә күплек сан кушымчасын ялгагыз: дус →
>
> Expected answer: ДУСЛАР

Student answers are written on paper. The app checks full answers, calculates points and grades, and builds learning analytics.

Character-level verification is only an internal support mechanism. It helps the product reconstruct a full handwritten answer and, if needed, explain exactly where an error may be located. The normal teacher interface must focus on:

- Assessment.
- Task.
- Full answer.
- Points.
- Percentage.
- Grade.
- Grammar topic.
- Student progress.
- Class learning patterns.

Detailed letter/cell evidence is hidden by default and should only appear when the teacher opens an uncertain or incorrect answer for review.

---

## 4. Audience and MVP scope

### Primary user

- Teacher of Tatar language and literature.

### MVP role model

- Teacher only.
- No student-facing mobile app.
- No parent account.
- No complicated school administration.
- No authentication screen in the hackathon demo: use a preconfigured demo teacher.

### Future audience

- Schools and gymnasiums in Tatarstan.
- Tutors.
- Weekend and national schools.
- Tatar diaspora schools.
- Later, the same model may be adapted for other languages of the peoples of Russia.

---

## 5. Main teacher journey

### Full end-to-end scenario

1. The teacher opens Kara Kuyan.
2. The teacher selects a ready-made test from the task bank or creates a short test from complete grammar tasks.
3. The teacher chooses a class and sets the assessment title, variants, and grading scale.
4. The teacher prepares personalised printable worksheets for the class.
5. Students complete the printed worksheets using uppercase handwritten letters, one letter per answer cell.
6. The teacher opens the active assessment and taps **«Сканировать следующую»**.
7. The teacher scans a completed worksheet using the phone camera.
8. The app identifies the student and worksheet variant.
9. The app checks the completed full answers and presents task-level results.
10. The teacher reviews only uncertain or suspicious tasks.
11. The app calculates points, percentage, and final grade.
12. The teacher saves the result and immediately scans the next worksheet.
13. When the class batch is complete, the teacher opens concise results and analytics.
14. The teacher can create follow-up practice from the identified topic or export a gradebook.

### Primary flow in one line

> Open active assessment → Scan next worksheet → Review only when needed → Save → Scan next worksheet.

The interface should minimize steps and repetitive confirmations in this flow.

---

## 6. Tests and tasks

### What the teacher creates

The teacher creates or selects a complete assessment, not a collection of letters.

A test contains approximately 6–8 full tasks, appropriate for one A4 worksheet. A task includes:

- Task number.
- Full Tatar prompt.
- Grammar topic.
- Expected full answer.
- Points.
- Optional difficulty level.
- A small answer-grid preview.

### Example grammar topics

- Юнәлеш килеше.
- Чыгыш килеше.
- Урын-вакыт килеше.
- Күплек сан.
- Тартым кушымчалары.

### Assignment sources

The teacher can:

- Open a ready-made test from a task bank.
- Use a teacher-created test.
- Assemble a test from task-bank items.
- Add a simple custom task.
- Duplicate an existing test as a starting point.

### Constructor principles

The mobile constructor must stay simple and linear:

1. **Выберите задания** — search and add complete task cards.
2. **Настройте тест** — title, class, variants, grading scale.
3. **Проверьте и создайте** — compact worksheet preview and creation confirmation.

Advanced options should not be visible by default.

---

## 7. Students, classes, and worksheets

### Classes

A teacher can work with multiple classes.

Example classes:

- 7-А · Татар теле.
- 6-Б · Татар теле.
- 8-А · Подготовка.

A class card should show only useful at-a-glance information:

- Number of students.
- Last activity or latest assessment.
- Compact progress indicator when relevant.

### Student identity

Use both name and readable code in teacher-facing screens:

- Галиев Амир Р. · 7A-014.
- Закирова Ләйсән И. · 7A-021.
- Хабибуллин Тимур М. · 7A-008.
- Нуриева Алия Р. · 7A-006.

The student list should support:

- Search by name or code.
- Manual student addition.
- Bulk import as a secondary action.
- Student history and progress view.

### Personalized printable worksheet

A worksheet is generated for a selected assessment and class. It includes:

- Student name.
- Student code.
- Assessment title.
- Variant number.
- QR code that identifies the student, assessment, and variant.
- Complete grammar tasks.
- Answer cells for each full answer.
- Visual markers helping the phone align the sheet when scanning.

The normal app interface should show the student identity as name + code. QR-based identification should feel reliable and automatic, but the teacher must be able to use **«Изменить ученика»** as a fallback.

---

## 8. Checking and review experience

### What a teacher sees after scanning

The teacher sees the result of a complete assessment, not a screen full of individual letters.

Top information:

- Student: `Галиев Амир Р. · 7A-014`.
- Assessment: `Контрольная работа №3`.
- Topic: `Исем килешләре и кушымчалар`.
- Result: `7 из 8 заданий`.
- Percentage and grade: `87% · Оценка 5`.

The worksheet preview groups written responses into full task blocks.

Each task block shows:

- Task number.
- Short answer preview.
- Status.
- Points earned.

Example:

- `1 · КИТАПКА · Верно · 1/1`.
- `2 · ӨСТӘЛДӘН · Верно · 1/1`.
- `3 · ДУСЛАР · Верно · 1/1`.
- `4 · Требует проверки · 0/1`.

### Task statuses

- **Верно** — the answer is accepted.
- **Ошибка** — the answer is confirmed incorrect.
- **Требует проверки** — the app cannot confidently determine the result; teacher action is needed.
- **Не выполнено** — the answer is missing, if applicable.

### Visual hierarchy

- Correct tasks: quiet, subtle green checkmark or muted success indicator.
- Incorrect tasks: red task-level marker.
- Uncertain tasks: amber task-level marker.
- Do not visually outline every correct character/cell in bright green.
- Show exact cell-level evidence only after the teacher opens a problematic task.

### Review screen

Review happens at the level of the full task and full answer.

Example:

> Задание 4 · Чыгыш килеше
>
> Куегыз сүзне чыгыш килешендә: өстәл →
>
> Правильный ответ: ӨСТӘЛДӘН
>
> Ответ ученика: ӨСТӘЛТӘН
>
> 1 ошибка в окончании

Actions:

- **Засчитать ответ**.
- **Отметить ошибку**.
- **Изменить балл** — secondary action or overflow menu.

Only in an expandable subsection, show technical evidence if useful:

> Детали распознавания
>
> Ожидалось: Д
>
> Распознано: Т
>
> Уверенность: 54%

If there are several tasks requiring review, the teacher should move through them automatically after each decision, for example: `2 из 3`.

---

## 9. Grading

The product calculates:

- Points earned.
- Maximum points.
- Percentage.
- Final grade on the Russian 2–5 scale.

Example result:

> 7 из 8 баллов · 87% · Оценка 5

### Custom grading scale

The teacher needs two grading-scale levels:

1. A default personal scale used for new tests.
2. A scale customized for one specific assessment.

Example scale:

- Оценка 5 — от 85%.
- Оценка 4 — от 70%.
- Оценка 3 — от 50%.
- Оценка 2 — ниже 50%.

The scale is configured during test creation. It is shown as a small summary by default and opens in an edit sheet only when the teacher chooses to change it.

Example live preview:

> 7 из 8 баллов = 87% → Оценка 5

---

## 10. Analytics

Analytics should help a teacher make the next pedagogical decision. It should not look like a business intelligence dashboard or an overloaded rating system.

### Three analytics levels

| Level | Teacher’s question | Main content |
|---|---|---|
| Assessment | How did the class do on this test? | Completion, average result, hardest tasks, common errors |
| Student | What should this student practise? | Progress, recent results, topics to revisit |
| Class | What should I repeat in the next lesson? | Average score, topic patterns, class progress |

### Priorities in analytics

The product should prioritize three core metrics:

1. **Средний результат**.
2. **Проблемные темы**.
3. **Прогресс по времени**.

### Class overview

The class analytics overview should show only a small number of useful blocks:

- Average result: `74%`.
- Change versus prior work if meaningful: `+8% к прошлой работе`.
- A compact progress line across recent assessments.
- One main topic to revisit.
- One optional action: `Подобрать упражнения`.

Example:

> Тема для повторения
>
> Чыгыш килеше
>
> 11 из 25 учеников допустили ошибки в окончаниях

### Topic list

A simple ranked list, not a dense heatmap:

- Чыгыш килеше · 42% ошибок · 11 учеников.
- Күплек сан · 18% ошибок · 6 учеников.
- Тартым кушымчалары · 9% ошибок · 3 ученика.

### Assignment analytics

For a completed test, show:

- How many worksheets are checked.
- Average score.
- Average grade.
- Compact grade distribution.
- Hardest grammar topic.
- Hardest task.
- Common full-answer pattern or misconception.

Example:

> Самое сложное задание
>
> Задание 4 · Чыгыш килеше
>
> 61% учеников допустили ошибку
>
> Частый ответ: ӨСТӘЛТӘН вместо ӨСТӘЛДӘН

### Student profile

A teacher-only student profile should remain respectful and minimal.

Show:

- Student name and code.
- Average result.
- Progress trend.
- Average grade.
- Up to three topics to practise.
- One positive learning note.
- Recent tests.

Example:

> Галиев Амир Р. · 7A-014
>
> 62% средний результат · +6% за 3 работы
>
> Тема для повторения: Чыгыш килеше
>
> Хорошо: Күплек сан

Use respectful phrases:

- Тема для повторения.
- Нужна дополнительная практика.
- Стабильный прогресс.
- Результат ниже среднего по классу.

Do not use:

- Слабый ученик.
- Отстаёт.
- Плохой результат.
- Не понимает тему.

### Character-level patterns

Patterns such as `Ң → Н` or `Ө → О` may appear only as secondary detail inside a topic page or a detailed insight. They must not become the main homepage metric or the main analytics narrative.

---

## 11. Teaching recommendations

Recommendations must be cautious, transparent, evidence-based, and optional.

The product should not present itself as an authority diagnosing students. It identifies visible patterns in checked work and gives the teacher a suggestion.

Preferred labels:

- Рекомендация для следующего урока.
- Педагогический вывод.
- Паттерн в последних результатах.

Do not aggressively label every recommendation as “AI recommendation”.

### Example recommendation

> Рекомендация для следующего урока
>
> Повторите чыгыш килеше
>
> 11 из 25 учеников допустили ошибки в окончаниях -дан / -дән / -тан / -тән.
>
> На основе 25 проверенных работ.

Actions:

- Подобрать упражнения.
- Посмотреть ошибки.
- Скрыть.

### Recommendation rules

- Show one recommendation at a time.
- Show evidence: number of checked works, affected students, topic, and error pattern.
- Use cautious language: `Рекомендуем повторить`, `Может быть полезно повторить`, `Обнаружен повторяющийся паттерн`.
- Let the teacher inspect the evidence.
- Let the teacher dismiss the insight.
- Never use recommendations to label, rank, or stigmatize a student.

---

## 12. Gradebook export

After an assessment is completed, the teacher can export a gradebook.

### Export context

Example:

> Контрольная работа №3
>
> 7-А · 24 ученика · 18 сентября

### Export format

- Excel (.xlsx) — recommended.
- CSV (.csv).

By default, export includes:

- Student names.
- Student codes.
- Variant.
- Points.
- Percentage.
- Final grade.
- Checking date.

The export should feel like a concluding action after assessment checking, not a main daily navigation destination.

---

## 13. Information architecture

### Main bottom navigation

Use four sections only:

1. **Главная**.
2. **Проверка**.
3. **Задания**.
4. **Ещё**.

### What lives in each section

**Главная**

- Continue active assessment.
- One compact class summary.
- One teaching recommendation.
- Recent activity.
- Shortcuts to choose/create assessment.

**Проверка**

- Current or recently active assessment.
- Checking progress.
- Scan next worksheet.
- Review queue.
- Compact list of recent/pending results.

**Задания**

- Мои тесты.
- Банк заданий.
- Search.
- One filter button.
- Create test.

**Ещё**

- Классы.
- Аналитика.
- Настройки.
- Приватность и справка.

### Contextual screens

- Test constructor.
- Grading scale edit sheet.
- Camera scanner.
- Processing state.
- Student confirmation.
- Assessment result.
- Task review.
- Assignment summary.
- Analytics.
- Student profile.
- Class detail.
- Export gradebook sheet.

---

## 14. Core UI and UX rules

### Minimalism

The visual and interaction design must be deliberately restrained:

- One dominant CTA per screen.
- One main decision per screen.
- Use more negative space.
- Use fewer cards and fewer borders.
- Do not show every capability at once.
- Do not repeat information in several places.
- Do not show permanent advanced filters or settings.
- Keep secondary actions as text actions, overflow menus, or bottom-sheet options.
- Do not show confidence percentages unless a teacher opens details.
- Do not show technical processing steps unless useful in the temporary scan animation.

### Reduce clicks

The most common actions must require very few interactions:

- Continue active checking from Home: one tap.
- Scan next worksheet from checking screen: one tap.
- Review a flagged task: one decision, then auto-advance.
- Save a completed worksheet and continue: one tap.
- Open one key teaching insight from Home: one tap.
- Export a completed gradebook: no more than two main taps after opening the completed assessment.

### Visual emphasis

- The main action should always be easy to identify.
- Correct work should be calm and visually quiet.
- Attention should be drawn only to uncertain and incorrect tasks.
- Red must be reserved for confirmed errors.
- Amber must be reserved for review/uncertainty.
- Green must be meaningful: main action, ready status, correct result, progress.

---

## 15. Visual design direction

### Overall look

- Android-first.
- Dark-first.
- Modern premium edtech.
- Calm, clear, trustworthy, and practical.
- Not childish.
- Not overly decorative.
- Not a dense enterprise dashboard.

### Palette

| Role | Color | Use |
|---|---:|---|
| Main background | #0B0F0D | App background |
| Raised surface | #141A17 | Cards, bottom sheets, navigation |
| Secondary surface | #1B241F | Input areas, inner blocks |
| Primary green | #25E38A | Main CTA, active states, success |
| Deep green | #0D8F54 | Pressed states, charts, accents |
| Mint | #A7F3C8 | Soft success detail |
| Main text | #F4F8F5 | Headings and content |
| Muted text | #99AAA1 | Supporting text |
| Divider | #2A352E | Borders and separators |
| Warning | #F5B942 | Review-required state |
| Error | #FF6868 | Confirmed answer error |

### Typography

- Use a modern sans-serif such as Manrope or Onest.
- Ensure reliable support for Russian and Tatar Cyrillic.
- Use a Noto Sans fallback if needed.
- Prioritize clear hierarchy and compact readable text.

### Components

- Use a refined Material 3 approach.
- Touch targets: at least 48 dp.
- Primary buttons: 52–56 dp high.
- Large cards: 16 dp radius.
- Inputs and compact cards: 12 dp radius.
- Status chips: pill shape.
- Use minimal shadows, subtle borders, and outline icons.
- Use bottom sheets for editing, filters, review, export, and secondary decisions.

### Brand marker

A temporary minimalist black rabbit mark can appear in:

- Splash/loading state.
- Empty state.
- Processing animation.

It must remain elegant and abstract, not a cartoon mascot. Final logo design is not required yet.

---

## 16. Russian-only prototype interface

For the hackathon prototype, all general interface copy must be in Russian.

Use Russian for:

- Navigation.
- Screen titles.
- Buttons.
- Statuses.
- Filters.
- Settings.
- Analytics labels.
- Notifications.
- Export options.
- Helper text.

Use Tatar only inside educational content:

- Grammar topic names.
- Task prompts.
- Expected answers.
- Student answers.
- Examples of grammar mistakes.

Examples:

- UI: `Проверка`, `Задания`, `Тема для повторения`, `Сканировать следующую`.
- Tatar content: `Чыгыш килеше`, `Куегыз сүзне чыгыш килешендә: өстәл →`, `ӨСТӘЛДӘН`.

Do not include a language switcher in the prototype. Localization can be a future capability.

---

## 17. Demo data

### Teacher

- Каримова Гөлнара Илдар кызы.
- Гимназия №2 им. Ш. Марджани.

### Main class

- 7-А · Татар теле.
- 25 учеников.

### Active assessment

- Контрольная работа №3.
- Исем килешләре һәм кушымчалар.
- 8 заданий · 2 варианта · 18 сентября.

### Demo state

- 18 из 25 работ проверено.
- 4 требуют проверки.
- Средний результат: 74%.
- Средняя оценка: 3,9.

### Demo students

- Галиев Амир Р. · 7A-014.
- Закирова Ләйсән И. · 7A-021.
- Хабибуллин Тимур М. · 7A-008.
- Нуриева Алия Р. · 7A-006.

### Demo result

- Галиев Амир Р. · 7 из 8 заданий · 87% · Оценка 5.

### Demo review case

> Задание 4 · Чыгыш килеше
>
> Куегыз сүзне чыгыш килешендә: өстәл →
>
> Правильный ответ: ӨСТӘЛДӘН
>
> Ответ ученика: ӨСТӘЛТӘН
>
> 1 ошибка в окончании

### Demo insight

> Рекомендация для следующего урока
>
> Повторите чыгыш килеше
>
> 11 из 25 учеников допустили ошибки в окончаниях -дан / -дән / -тан / -тән.

---

## 18. Hackathon demonstration story

The strongest demo sequence is:

1. Open the active full grammar assessment.
2. Show that it is ready for checking.
3. Scan a personalised paper worksheet.
4. Show quick automatic identification of the student and variant.
5. Show the result for the full test: completed tasks, points, percentage, and grade.
6. Open one uncertain task and show that the teacher has final control.
7. Save the worksheet and show the immediate next action: scan the next one.
8. Open class analytics and show a clear grammar topic that should be repeated.
9. Open the teaching recommendation and show the evidence behind it.
10. Show export of the gradebook.

The story should communicate that Kara Kuyan saves teacher time while helping the teacher understand what to do next in the lesson.

---

## 19. What to avoid

Do not position or design Kara Kuyan as:

- A letter-recognition app.
- A generic OCR scanner.
- A student cheat or homework-solver app.
- A complex school CRM.
- A social network.
- A crowded dashboard with many charts and rankings.
- A public student leaderboard.
- A product that gives harsh judgments or diagnoses students.
- A colorful children’s game.

Avoid these interface mistakes:

- Too many bottom navigation items.
- Too many buttons with equal visual importance.
- Bright green borders around every correct character.
- Letter/cell analytics as the main result.
- Technical confidence values on main screens.
- Requiring the teacher to repeatedly choose a class/test during batch checking.
- Excessive scrolling and long forms.
- Persistent advanced settings and filters.
- Mixed Russian/Tatar UI chrome.

---

## 20. Final product statement

Kara Kuyan should make a teacher feel:

> “I can prepare and check a full class of paper-based Tatar language assessments quickly, trust the results, see what the class needs next, and spend less time on routine work.”
