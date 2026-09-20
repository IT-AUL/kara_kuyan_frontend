# Кара Куян · Kara Kuyan

> Android-приложение для учителей татарского языка: мгновенная проверка бумажных проверочных работ через камеру смартфона, аналитика класса и полная приватность.

[![Release](https://img.shields.io/github/v/release/IT-AUL/kara_kuyan_frontend?color=25E38A&label=Релиз)](https://github.com/IT-AUL/kara_kuyan_frontend/releases)
[![Platform](https://img.shields.io/badge/Платформа-Android%207%2B-blue)](https://it-aul.github.io/kara_kuyan_frontend/)
[![Architecture](https://img.shields.io/badge/Приватность-Zero--Photo-brightgreen)](docs/adr/0003-zero-photo-on-device-processing.md)
[![Team](https://img.shields.io/badge/Команда-IT--AUL-yellow)](https://it-aul.com/)

---

## ⚡ О проекте

**Кара Куян** автоматизирует рутинную проверку тестов и контрольных по татарскому языку: учитель наводит камеру на стопку работ и за секунды получает проверенный класс с журналом оценок и списком тем для повторения.

- **3 секунды на лист** — локальный OCR-движок на базе ONNX распознаёт рукописные ответы на татарском алфавите (`Ә`, `Ө`, `Ү`, `Җ`, `Ң`, `Һ`) прямо на процессоре смартфона.
- **Zero-Photo (152-ФЗ)** — кадры камеры обрабатываются исключительно в RAM и тут же стираются. Фотографии работ не сохраняются в память телефона и не отправляются на сервера.
- **Офлайн-первичность** — проверка работает в любом кабинете без Wi-Fi и сотовой связи. Результаты сохраняются в локальный SQLite-аутбокс и синхронизируются при появлении сети.
- **Аналитика пробелов** — автоматический расчет среднего балла, выявление тем с частыми ошибками и экспорт ведомостей в XLSX/CSV.
- **Самообновление** — приложение самостоятельно проверяет и скачивает новые релизы из GitHub Releases без Google Play.

---

## 📲 Ссылки

- 🌐 **[Официальный сайт и скачать APK](https://it-aul.github.io/kara_kuyan_frontend/)**
- 📦 **[GitHub Releases](https://github.com/IT-AUL/kara_kuyan_frontend/releases)**
- 🏢 **[IT-AUL](https://it-aul.com/)**

---

## 🛠 Стек технологий

| Слой | Технологии |
|---|---|
| **App / UI** | React Native, Expo SDK 57, TypeScript, Custom Dev Client |
| **OCR & Native** | Kotlin, CameraX, ArUco rectification, ONNX Runtime (XNNPACK) |
| **Данные и синхронизация** | SQLite (Durable Outbox), REST API |
| **Дистрибуция** | GitHub Actions, ABI split-APKs (`arm64-v8a`, `armeabi-v7a`, `x86_64`, `universal`) |

---

## 🚀 Разработка

```bash
# Установка зависимостей (pnpm 12.4.1)
pnpm install

# Запуск локального Expo-сервера
pnpm run start

# Проверка качества кода (обязательные гейты)
pnpm run lint
pnpm run typecheck
pnpm test --runInBand
pnpm run check-deps
pnpm run doctor
```

---

## 📚 Документация

- [`docs/STATUS.md`](docs/STATUS.md) — текущий статус реализации и открытые задачи
- [`docs/adr/`](docs/adr/) — архитектурные решения (ADRs 0001–0009)
- [`docs/contracts/`](docs/contracts/) — контракты API и спецификации бланков
- [`AGENTS.md`](AGENTS.md) — регламент для AI-ассистентов и разработки
