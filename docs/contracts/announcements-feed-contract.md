# Контракт удалённых уведомлений и новостей (`Announcements Feed v1`)

Документ описывает единый формат удалённой рассылки новостей, анонсов событий и методических подсказок в приложение **Кара Куян** (ADR 0010).

Приложение опрашивает два источника (и объединяет карточки без дублей по `id`):
1. **CDN-лента (работает сразу без изменений бэкенда):** `https://it-aul.github.io/kara_kuyan_frontend/announcements.json` (файл `site/announcements.json` в репозитории, деплоится автоматически через `.github/workflows/deploy-site.yml` за ~20 секунд после пуша в `main`; поддерживает `ETag` / `304 Not Modified`). Переопределяется переменной `EXPO_PUBLIC_ANNOUNCEMENTS_URL`.
2. **Опциональный эндпоинт бэкенда (предложение для `api.kara-kuyan.it-aul.ru`):** `GET /api/v1/announcements` с заголовком `X-Teacher-UUID`. Пока эндпоинт возвращает `404`, приложение тихо пропускает его без ошибок; как только он появится на сервере, уже установленные APK начнут получать серверные уведомления автоматически.

---

## 1. JSON-схема ответа (`announcements.json` и `GET /api/v1/announcements`)

Принимается либо объект `{ "version": 1, "items": [...] }`, либо корневой массив `[...]`.

```json
{
  "version": 1,
  "updatedAt": "2026-11-13T00:00:00Z",
  "items": [
    {
      "id": "2026-11-cpp-ocr-live",
      "kind": "news",
      "channelId": "updates_news",
      "tone": "ok",
      "icon": "news",
      "badge": "Обновление · C++ OCR",
      "title": "Запущен эталонный сканер татарского почерка v4",
      "summary": "Автоповорот вертикальных фото, защита от бликов лампы и точность Top-3 99,5%.",
      "body": "Мы подключили единое C++20-ядро распознавания рукописных работ и новую ленту важных событий. Теперь вы будете первыми узнавать об олимпиадах, новых шаблонах карточек и обновлениях проверки.",
      "publishedAt": "2026-11-13T00:00:00Z",
      "expiresAt": "2027-06-01T00:00:00Z",
      "pinned": true,
      "systemNotify": false,
      "minAppVersion": "0.4.0",
      "actionLabel": "Открыть сканер",
      "route": "/scan",
      "secondaryActionLabel": "Аналитика класса",
      "secondaryRoute": "/analytics"
    }
  ]
}
```

### Поля элемента (`RemoteAnnouncementInput`)

| Поле | Обяз. | Тип / Допустимые значения | Описание |
| :--- | :---: | :--- | :--- |
| `id` | да | `string` (`^[a-zA-Z0-9._:-]{3,80}$`) | Уникальный ключ. По нему идёт дедупликация прочитанного, скрытого и показанного в шторке Android (учитель никогда не получит повторный пуш с тем же `id`). |
| `title` | да | `string` (до 120 симв.) | Заголовок карточки и системного уведомления Android. |
| `summary` | да | `string` (до 280 симв.) | Короткое превью (1–2 строки в ленте `/notifications`, лид-абзац статьи и текст в шторке Android). |
| `body` | нет | `string` (до 4000 симв.) | Полный текст статьи на экране `/notification-detail`. Поддерживает абзацы через пустую строку (`\n\n`), подзаголовки `### Заголовок`, списки `- пункт`, нумерованные шаги `1. шаг` и заметки `> совет`. |
| `kind` | нет | `'event' \| 'insight' \| 'news' \| 'tip'` | Вкладка ленты: `event`/`insight` попадают в «События», `news`/`tip` — в «Инфо». По умолчанию `'news'`. |
| `channelId` | нет | `'check_sync' \| 'class_insights' \| 'updates_news' \| 'teacher_tips'` | Канал Android `NotificationChannel`. По умолчанию `'updates_news'`. |
| `tone` | нет | `'ok' \| 'warn' \| 'err' \| 'info'` | Цвет плашки `badge`. По умолчанию `'info'`. |
| `icon` | нет | `'check' \| 'sync' \| 'warning' \| 'insight' \| 'release' \| 'tip' \| 'news'` | Иконка карточки. |
| `badge` | нет | `string` (до 40 симв.) | Короткая метка сверху карточки (например, `"Олимпиада"`, `"Важно"`). |
| `publishedAt` | нет | ISO 8601 (`2026-11-13T09:00:00Z`) | Время публикации для сортировки в ленте. |
| `expiresAt` | нет | ISO 8601 | После этой даты карточка автоматически перестаёт показываться. |
| `pinned` | нет | `boolean` | Закрепить карточку вверху списка. |
| `systemNotify` | нет | `boolean` | Если `true`, при первом получении (в том числе в фоне через Android `WorkManager`) поднимет системное уведомление в шторке Android (если учитель разрешил уведомления и соответствующий канал). |
| `minAppVersion` | нет | `semver` (`"0.4.0"`) | Показывать только на версиях приложения `>= minAppVersion`. |
| `maxAppVersion` | нет | `semver` (`"0.4.9"`) | Показывать только на версиях приложения `<= maxAppVersion` (например, просьба обновиться со старой сборки). |
| `actionLabel` | нет | `string` (до 36 симв.) | Текст основной кнопки действия (и кнопки в шторке Android). |
| `route` | нет | `"/..."` или `"https://..."` | Внутренний экран приложения (`/scan`, `/checking`, `/analytics`, `/task-generate`, `/export-gradebook`, `/more`) либо внешняя `https://`-ссылка (откроется в браузере/Telegram). Схемы `http://`, `javascript:`, `file:` отклоняются. |
| `externalUrl` | нет | `"https://..."` | Синоним внешней ссылки для `route` (удобно в админке бэкенда). |
| `secondaryActionLabel` | нет | `string` (до 36 симв.) | Текст второй кнопки карточки. |
| `secondaryRoute` | нет | `"/..."` или `"https://..."` | Маршрут или `https://`-ссылка второй кнопки. |

> **Правило приватности (ADR 0003 / ADR 0010):** в `announcements` запрещено передавать ФИО конкретных учеников и персональные оценки — только общие события, методические материалы и обезличенные сводки.

---

## 2. Как отправить уведомление за 15 секунд уже сегодня (через CLI или GitHub)

### Способ А — одной командой из терминала
```bash
pnpm run news:add -- \
  --id "2026-11-olympiad" \
  --kind event \
  --tone ok \
  --badge "Событие · РТ" \
  --title "Республиканская олимпиада по татарскому языку" \
  --summary "Открыта подборка тренировочных карточек для подготовки 5–9 классов." \
  --body "В конструкторе заданий доступны новые упражнения по падежным аффиксам и сингармонизму для быстрой пятиминутки в начале урока." \
  --action-label "Собрать разминку" \
  --route "/task-generate" \
  --notify
```
Затем `git add site/announcements.json && git commit -m "chore(news): add olympiad announcement" && git push` — GitHub Pages обновит `announcements.json` через ~20 секунд, и телефоны учителей получат уведомление при открытии или следующей фоновой проверке `WorkManager`.

### Способ Б — прямо с телефона на GitHub
Откройте `site/announcements.json` в браузере на GitHub → нажмите карандаш (Edit) → добавьте объект в начало массива `items` → `Commit changes`.

---

## 3. Готовый FastAPI-роутер для бэкенда (`api.kara-kuyan.it-aul.ru`)

Когда понадобится отправлять новости из БД / админки бэкенда (в том числе таргетированно по `X-Teacher-UUID`), достаточно подключить на сервере эндпоинт `GET /api/v1/announcements`:

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["announcements"])


class AnnouncementItem(BaseModel):
    id: str
    kind: str = "news"  # event | insight | news | tip
    channelId: str = "updates_news"  # check_sync | class_insights | updates_news | teacher_tips
    tone: str = "info"  # ok | warn | err | info
    icon: str = "news"
    badge: str = "Новость"
    title: str
    summary: str
    body: str | None = None
    publishedAt: str
    expiresAt: str | None = None
    pinned: bool = False
    systemNotify: bool = True
    minAppVersion: str | None = None
    maxAppVersion: str | None = None
    actionLabel: str | None = None
    route: str | None = None
    secondaryActionLabel: str | None = None
    secondaryRoute: str | None = None


class AnnouncementsResponse(BaseModel):
    version: int = 1
    updatedAt: str
    items: list[AnnouncementItem]


@router.get("/announcements", response_model=AnnouncementsResponse)
async def list_announcements(
    x_teacher_uuid: str | None = Header(default=None, alias="X-Teacher-UUID"),
) -> AnnouncementsResponse:
    # Здесь можно читать активные объявления из PostgreSQL/SQLite или JSON-конфига,
    # при желании фильтруя по школе/учителю (x_teacher_uuid).
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return AnnouncementsResponse(version=1, updatedAt=now_iso, items=[])
```
