# HR System Updates — 2026-04-21

## Реалізовано

- Додано модуль скарг на працівників: API, сторінку, модальне створення/редагування, фільтри, мобільну підтримку та Playwright E2E-покриття.
- Додано Playwright-тестову архітектуру: fixtures, page objects, desktop/mobile проєкти, окремі команди запуску й документацію в `e2e/README.md`.
- Додано audit log для скарг і працівників: створення, оновлення, видалення та зміна зарплати записуються в `audit_events`.
- Додано endpoint `GET /api/audit` для адміністративного перегляду подій.
- Додано endpoint `GET /api/complaints/{id}/timeline` для історії змін конкретної скарги.
- Розширено `/api/stats` HR-ризиками: активні скарги, критичні скарги, працівники з повторними активними скаргами.
- Додано dashboard risk-panel і центр сповіщень для адміністраторів.
- Розширено профіль працівника секцією скарг і звернень.
- Додано CSV-експорт для реєстру працівників і списку скарг.
- Додано базовий frontend-шар permissions: рольові назви та централізована перевірка дій створення.

## Оновлені API

- `GET /api/audit?limit=8`
  - Адмінський список останніх службових подій.
- `GET /api/audit?entity_type=complaint&entity_id=1`
  - Фільтр audit-подій за сутністю.
- `GET /api/complaints/{id}/timeline`
  - Timeline однієї скарги.
- `GET /api/stats`
  - Додано поле `riskMetrics`.

## UI

- Dashboard тепер показує окремий блок HR-ризиків.
- Dashboard для admin показує центр службових сповіщень.
- Профіль працівника показує повʼязані скарги.
- Працівники та скарги мають кнопку `Експорт CSV`.
- Нові компоненти винесені в окремі файли, щоб не перевищувати ліміт 250 рядків на source-файл.

## Тестова архітектура

- `npm run test:e2e` запускає Playwright desktop/mobile smoke та complaints-сценарії.
- `playwright.config.js` сам будує frontend і стартує backend на тестовій SQLite-базі.
- E2E-артефакти винесені в `.playwright-data`, `test-results`, `playwright-report`.

## Перевірки

Пройшли:

- `npm run check:max-lines`
- `cargo test --manifest-path backend/Cargo.toml --locked --test complaints_contracts`
- `npm run test --workspace frontend -- --run src/test/complaints-feature.test.jsx`
- `cargo test --manifest-path backend/Cargo.toml --locked`
- `cargo clippy --manifest-path backend/Cargo.toml --all-targets -- -D warnings`
- `npm run test:frontend`
- `npm run test:e2e`
- `npm audit --json`
- `npm run verify`

Результат: backend `46` тестів, frontend `135` тестів, Playwright `7` тестів, `npm audit` без вразливостей, production build зелений.
