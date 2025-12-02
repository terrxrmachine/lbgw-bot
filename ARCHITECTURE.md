# Архитектура LBGW Telegram Bot

## Обзор

LBGW Bot — это TypeScript приложение на Node.js, интегрированное с сайтом Lucky Bali Group для автоматизации управления отзывами и мониторинга статистики.

## Схема взаимодействия

```
┌──────────────────┐
│  Пользователи    │
│     (сайт)       │
└────────┬─────────┘
         │
         │ Оставляют отзыв
         ▼
┌──────────────────────────────────────────┐
│        LBGW Website (Next.js)            │
│  ┌────────────────────────────────────┐  │
│  │   POST /api/reviews                │  │
│  │   - Сохраняет в Strapi (draft)    │  │
│  │   - Отправляет в Telegram          │  │
│  └────────────────────────────────────┘  │
└────────┬─────────────────────────────────┘
         │
         │ Webhook / sendMessage
         ▼
┌──────────────────────────────────────────┐
│       Telegram Bot API                   │
│  ┌────────────────────────────────────┐  │
│  │  Доставляет сообщение с кнопками  │  │
│  └────────────────────────────────────┘  │
└────────┬─────────────────────────────────┘
         │
         │ Polling / Callback Query
         ▼
┌──────────────────────────────────────────┐
│          LBGW Bot (этот проект)          │
│  ┌────────────────────────────────────┐  │
│  │  ReviewsHandler                    │  │
│  │  - Обрабатывает callback кнопок    │  │
│  │  - Вызывает API публикации         │  │
│  │  - Публикует в канал               │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  CommandsHandler                   │  │
│  │  - /start, /help, /stats           │  │
│  │  - Запрашивает Яндекс.Метрику      │  │
│  └────────────────────────────────────┘  │
└────────┬─────────────────────────────────┘
         │
         ├─► POST /api/reviews/publish
         │   (одобрить/отклонить)
         │
         └─► Yandex Metrica API
             (статистика)
```

## Компоненты

### 1. Обработчики (Handlers)

#### ReviewsHandler
**Назначение**: Модерация отзывов через inline-кнопки

**Функции**:
- `handleCallback()` — обработка нажатий кнопок ✅/❌
- `publishToChannel()` — публикация одобренных отзывов в канал
- `extractReviewText()` — форматирование текста отзыва

**Поток обработки**:
```
Callback Query → Парсинг ID → API Call → Update Message → Publish to Channel
```

#### CommandsHandler
**Назначение**: Обработка команд бота

**Функции**:
- `handleStart()` — приветствие
- `handleHelp()` — справка
- `handleStats()` — статистика
- `handleUnknown()` — неизвестные команды

**Поток обработки**:
```
/stats today → Parse Period → Fetch from YM → Format → Send Message
```

### 2. Сервисы (Services)

#### LBGWApiService
**Назначение**: Взаимодействие с API сайта

**Методы**:
- `publishReview(id, action)` — публикация/отклонение отзыва
- `getReview(id)` — получение данных отзыва

**Аутентификация**: API ключ в заголовке `X-API-Key`

#### YandexMetricaService
**Назначение**: Получение статистики из Яндекс.Метрики

**Методы**:
- `parsePeriod(str)` — парсинг периода из команды
- `getMetrics(period)` — запрос метрик из API
- `formatMetrics(data)` — форматирование для Telegram
- `getWeeklyMetrics()` — недельная статистика (для cron)

**Аутентификация**: OAuth токен

### 3. Конфигурация (Config)

**config/index.ts**:
- Загрузка переменных окружения
- Валидация обязательных параметров
- Экспорт типизированной конфигурации

### 4. Типы (Types)

**types/index.ts**:
- `ReviewData` — структура отзыва
- `MetricaPeriod` — период для статистики
- `MetricsData` — структура метрик
- `BotCommand` — структура команды
- `CallbackData` — данные callback кнопок

### 5. Утилиты (Utils)

**logger.ts**:
- Централизованное логирование
- Уровни: INFO, SUCCESS, WARN, ERROR, DEBUG
- Форматирование с timestamp и префиксом

## Потоки данных

### Модерация отзыва (Approve)

```
1. Пользователь нажимает ✅ Approve
   ↓
2. Telegram отправляет callback_query
   ↓
3. ReviewsHandler.handleCallback()
   ↓
4. LBGWApiService.publishReview(id, 'approve')
   ↓
5. LBGW API: PUT /api/reviews/{id}
   { data: { publishedAt: ISO_DATE } }
   ↓
6. Strapi публикует отзыв (draft → published)
   ↓
7. ReviewsHandler.publishToChannel()
   ↓
8. Telegram Bot API: sendMessage to channel
   ↓
9. ReviewsHandler.editMessageText()
   ↓
10. Callback answer: "✅ Отзыв опубликован"
```

### Получение статистики

```
1. Пользователь: /stats 30d
   ↓
2. CommandsHandler.handleStats()
   ↓
3. YandexMetricaService.parsePeriod('30d')
   → { start: '2024-12-15', end: '2025-01-15' }
   ↓
4. YandexMetricaService.getMetrics(period)
   ├─► GET metrika/v1/data?metrics=visits,users,pageviews
   └─► GET metrika/v1/data?dimensions=startURL&metrics=pageviews
   ↓
5. Объединение данных → MetricsData
   ↓
6. YandexMetricaService.formatMetrics(data)
   → Форматированный текст для Telegram
   ↓
7. bot.sendMessage(chatId, text, { parse_mode: 'HTML' })
```

## Безопасность

### Аутентификация

**API сайта LBGW**:
- Header: `X-API-Key: {REVIEWS_PUBLISH_API_KEY}`
- Проверка на стороне сайта в `/api/reviews/publish`

**Яндекс.Метрика**:
- Header: `Authorization: OAuth {YM_OAUTH_TOKEN}`
- Токен с ограниченными правами (только чтение)

### Валидация

**При старте**:
- Проверка обязательных env переменных
- Выброс ошибки при отсутствии ключей

**При обработке callback**:
- Парсинг и валидация формата: `review_(approve|reject)_(\d+)`
- Проверка существования reviewId в API

## Обработка ошибок

### Уровни

1. **Критические** (exit процесса):
   - Отсутствие обязательных env переменных
   - Uncaught exceptions
   - Unhandled rejections

2. **Recoverable** (логирование + продолжение):
   - Ошибки API сайта
   - Ошибки Яндекс.Метрики
   - Ошибки Telegram API

### Стратегия

```typescript
try {
  // Основная логика
} catch (error) {
  logger.error('Message', error);
  // Отправка пользователю понятного сообщения
  bot.sendMessage(chatId, '❌ Произошла ошибка');
}
```

## Масштабирование

### Текущая архитектура
- **Polling mode** — бот сам опрашивает Telegram API
- **Single instance** — один процесс бота

### Возможные улучшения

1. **Webhook mode**:
   ```
   Telegram → HTTPS → Express → Bot handlers
   ```
   - Меньше нагрузки
   - Быстрее реакция

2. **Multiple instances**:
   ```
   Load Balancer → Bot 1
                 → Bot 2
                 → Bot 3
   ```
   - Требует webhook mode
   - Распределение нагрузки

3. **Queue system**:
   ```
   Telegram → Bot → Queue (Redis) → Workers
   ```
   - Асинхронная обработка
   - Retry логика

4. **Database caching**:
   ```
   Bot → Redis Cache → Yandex Metrica API
   ```
   - Кеширование метрик
   - Снижение запросов к API

## Мониторинг

### Логирование

**Уровни важности**:
- `ERROR` — требует внимания
- `WARN` — потенциальные проблемы
- `INFO` — обычная работа
- `DEBUG` — детальная отладка (только dev)

**Что логируется**:
- Все команды пользователей
- Все API вызовы
- Все ошибки с деталями
- Старт/стоп бота

### Метрики (будущее)

Возможные интеграции:
- **Prometheus** — сбор метрик
- **Grafana** — визуализация
- **Sentry** — отслеживание ошибок

## Развитие

### Краткосрочные улучшения

1. **Webhook mode** вместо polling
2. **Еженедельные отчёты** (cron)
3. **Экспорт статистики** (Excel/PDF)
4. **Фильтры отзывов** по языку/дате

### Долгосрочные улучшения

1. **Admin panel** через Telegram Web Apps
2. **Multi-bot support** для разных языков
3. **AI модерация** отзывов
4. **Analytics dashboard** в боте
5. **User management** система ролей

## Зависимости

### Production
- `node-telegram-bot-api` — Telegram Bot API клиент
- `axios` — HTTP запросы
- `dotenv` — Переменные окружения

### Development
- `typescript` — Типизация
- `tsx` — TypeScript runner с hot-reload
- `@types/*` — Типы для библиотек
- `eslint` — Линтер

## Требования

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **RAM**: ~50MB в idle, ~100MB под нагрузкой
- **CPU**: Минимальная (event-driven)

## Производительность

### Типичные показатели

- **Startup time**: ~500ms
- **Command response**: <100ms
- **Callback processing**: <200ms
- **Stats API call**: ~1-2s (зависит от YM)
- **Memory usage**: ~50-100MB

### Оптимизации

- Асинхронная обработка всех I/O
- Минимальные зависимости
- TypeScript компиляция в production
- Event-driven архитектура
