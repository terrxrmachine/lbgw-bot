# Инструкция по развертыванию LBGW Telegram Bot

## Текущий статус

✅ **Бот успешно развернут на сервере `217.26.25.113`**

### Информация о развертывании

- **Директория на сервере**: `/opt/lbgw-bot`
- **Systemd сервис**: `lbgw-bot.service`
- **Статус**: `active (running)`
- **Автозапуск**: Включен

## Архитектура системы

### Как работает интеграция

```
┌─────────────────┐
│  LBGW Website   │
│  (Next.js)      │
│  /opt/lbgw      │
└────────┬────────┘
         │
         │ 1. Новый отзыв создается через форму
         │    POST /api/reviews
         │
         ▼
┌─────────────────────────────────┐
│  Strapi CMS (localhost:1337)    │
│  - Сохраняет отзыв как DRAFT    │
│  - publishedAt = null            │
└────────┬────────────────────────┘
         │
         │ 2. Отправляет уведомление в Telegram
         │    через Telegram Bot API
         │
         ▼
┌──────────────────────┐
│  Telegram Bot        │
│  @feedback_lucky_    │
│  bali_group_bot      │
└──────────┬───────────┘
           │
           │ 3. Отправляет сообщение с inline-кнопками
           │    ✅ Approve | ❌ Reject
           │
           ▼
┌──────────────────────┐
│  Администратор       │
│  (Chat ID:           │
│   6626945924)        │
└──────────┬───────────┘
           │
           │ 4. Нажимает кнопку Approve/Reject
           │
           ▼
┌──────────────────────┐
│  LBGW Bot Service    │
│  /opt/lbgw-bot       │
└──────────┬───────────┘
           │
           │ 5. Вызывает API сайта
           │    POST https://luckybaligroup.com/api/reviews/publish
           │    Headers: X-API-Key: lbgw_publish_reviews_secure_key_2025
           │
           ▼
┌─────────────────────────────────┐
│  LBGW Website API               │
│  /api/reviews/publish           │
└────────┬────────────────────────┘
         │
         │ 6. Approve: публикует отзыв (publishedAt = NOW)
         │    Reject: удаляет отзыв из Strapi
         │
         ▼
┌─────────────────────────────────┐
│  Strapi CMS                     │
│  - Approve: UPDATE publishedAt  │
│  - Reject: DELETE review        │
└─────────────────────────────────┘
```

## Конфигурация

### Переменные окружения бота

Файл: `/opt/lbgw-bot/.env`

```env
TELEGRAM_BOT_TOKEN=7616206547:AAGZX9Uu4As9UdM3Lth2dVE7J-cfMaffvS4
TELEGRAM_CHAT_ID=6626945924
LBGW_API_URL=https://luckybaligroup.com
REVIEWS_PUBLISH_API_KEY=lbgw_publish_reviews_secure_key_2025
NODE_ENV=production
```

### Переменные окружения сайта

Файл: `/opt/lbgw/.env.local`

```env
NEXT_PUBLIC_BASE_URL=https://luckybaligroup.com
NEXT_PUBLIC_CMS_URL=http://localhost:1337/api
STRAPI_API_TOKEN=b1570dca7189ad6b3ad6a0fb59381bb5658b6b83107125ab3492ca909d799ee12cd93567195d1c25764777e4b12f2b0fa195056c4433f4b0b6bb65df9fe1bc8519e9cd95a93ccf3319afecb1781fe02c0a7caec1cb81f14e0ebb15d58c0d903462954b20656e43566d2bae7aa6db06184e8e81dad98dfb8519797601db43bb40
TELEGRAM_BOT_TOKEN=7616206547:AAGZX9Uu4As9UdM3Lth2dVE7J-cfMaffvS4
TELEGRAM_CHAT_ID=6626945924
REVIEWS_PUBLISH_API_KEY=lbgw_publish_reviews_secure_key_2025
```

## Управление сервисом

### Команды systemctl

```bash
# Просмотр статуса
systemctl status lbgw-bot

# Перезапуск
systemctl restart lbgw-bot

# Остановка
systemctl stop lbgw-bot

# Запуск
systemctl start lbgw-bot

# Отключить автозапуск
systemctl disable lbgw-bot

# Включить автозапуск
systemctl enable lbgw-bot
```

### Просмотр логов

```bash
# Последние 50 строк
journalctl -u lbgw-bot -n 50

# Логи в реальном времени
journalctl -u lbgw-bot -f

# Логи за сегодня
journalctl -u lbgw-bot --since today

# Логи с конкретного времени
journalctl -u lbgw-bot --since "2025-12-02 16:00:00"
```

## Обновление бота

### 1. Локальная разработка

```bash
# В директории проекта на локальной машине
cd /Users/terrxrmachine/Documents/Работа/lbgw-bot

# Внесите изменения в код

# Соберите проект
npm run build

# Закоммитьте изменения
git add .
git commit -m "Update: описание изменений"
git push
```

### 2. Развертывание на сервер

```bash
# Скопируйте файлы на сервер (исключая node_modules)
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude='node_modules' \
  --exclude='.git' \
  /Users/terrxrmachine/Documents/Работа/lbgw-bot/ \
  root@217.26.25.113:/opt/lbgw-bot/

# Подключитесь к серверу
ssh -i ~/.ssh/id_ed25519 root@217.26.25.113

# Перейдите в директорию бота
cd /opt/lbgw-bot

# Установите зависимости (если package.json изменился)
npm install --production

# Перезапустите сервис
systemctl restart lbgw-bot

# Проверьте статус
systemctl status lbgw-bot

# Проверьте логи
journalctl -u lbgw-bot -f
```

### 3. Быстрое обновление (без rsync)

```bash
ssh -i ~/.ssh/id_ed25519 root@217.26.25.113 << 'ENDSSH'
cd /opt/lbgw-bot
git pull
npm install --production
npm run build
systemctl restart lbgw-bot
systemctl status lbgw-bot
ENDSSH
```

## Тестирование

### 1. Проверка работы бота

Откройте Telegram и отправьте команду боту:

```
/start
```

Должно прийти приветственное сообщение.

### 2. Проверка модерации отзывов

1. Откройте сайт https://luckybaligroup.com
2. Найдите форму отзывов
3. Заполните и отправьте тестовый отзыв
4. В Telegram должно прийти уведомление с кнопками:
   - ✅ Approve
   - ❌ Reject
5. Нажмите одну из кнопок
6. Проверьте, что отзыв опубликован или удален

### 3. Проверка логов

```bash
# На сервере
journalctl -u lbgw-bot -f
```

Вы должны увидеть:
- `[INFO] Bot handlers registered`
- `[SUCCESS] ✅ LBGW Bot started successfully!`
- При нажатии кнопок: `Processing approve/reject for review #123`

## Устранение неполадок

### Бот не запускается

```bash
# Проверьте логи
journalctl -u lbgw-bot -n 50

# Проверьте .env файл
cat /opt/lbgw-bot/.env

# Проверьте, что все зависимости установлены
cd /opt/lbgw-bot && npm install

# Попробуйте запустить вручную
cd /opt/lbgw-bot && node dist/index.js
```

### Отзывы не приходят в Telegram

1. Проверьте, что сайт запущен и доступен
2. Проверьте переменные окружения на сайте:
   ```bash
   cat /opt/lbgw/.env.local | grep TELEGRAM
   ```
3. Проверьте логи сайта
4. Убедитесь, что `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` правильные

### Кнопки не работают

1. Проверьте, что бот запущен:
   ```bash
   systemctl status lbgw-bot
   ```
2. Проверьте логи бота:
   ```bash
   journalctl -u lbgw-bot -f
   ```
3. Проверьте, что API ключ совпадает на боте и сайте:
   ```bash
   grep REVIEWS_PUBLISH_API_KEY /opt/lbgw-bot/.env
   grep REVIEWS_PUBLISH_API_KEY /opt/lbgw/.env.local
   ```

### Отзыв не публикуется на сайте

1. Проверьте, что Strapi CMS запущен:
   ```bash
   curl http://localhost:1337/api
   ```
2. Проверьте `STRAPI_API_TOKEN` на сайте
3. Проверьте логи сайта Next.js

## API Endpoints

### LBGW Website API

#### POST /api/reviews
Создает новый отзыв (DRAFT) и отправляет уведомление в Telegram.

**Payload:**
```json
{
  "name": "John Doe",
  "text": "Great service!",
  "avatar": "data:image/png;base64,...",
  "locale": "en"
}
```

#### POST /api/reviews/publish
Публикует или отклоняет отзыв.

**Headers:**
```
X-API-Key: lbgw_publish_reviews_secure_key_2025
```

**Payload:**
```json
{
  "reviewId": 123,
  "action": "approve" // или "reject"
}
```

**Response:**
```json
{
  "success": true,
  "action": "approved",
  "reviewId": 123,
  "message": "Review published successfully"
}
```

## Контакты

- **Telegram бот**: [@feedback_lucky_bali_group_bot](https://t.me/feedback_lucky_bali_group_bot)
- **Chat ID**: 6626945924
- **Сервер**: 217.26.25.113

## Дополнительные возможности

### Яндекс.Метрика (опционально)

Для добавления статистики из Яндекс.Метрики:

1. Получите OAuth токен на https://oauth.yandex.ru/
2. Найдите ID счётчика в интерфейсе Яндекс.Метрики
3. Добавьте в `/opt/lbgw-bot/.env`:
   ```env
   YM_COUNTER_ID=ваш_counter_id
   YM_OAUTH_TOKEN=ваш_oauth_token
   ```
4. Перезапустите бота: `systemctl restart lbgw-bot`
5. Используйте команду `/stats` в боте

### Канал для отзывов (опционально)

Для автоматической публикации одобренных отзывов в канал:

1. Создайте канал в Telegram
2. Добавьте бота как администратора
3. Добавьте в `/opt/lbgw-bot/.env`:
   ```env
   TELEGRAM_REVIEWS_CHANNEL=@your_channel_name
   ```
4. Перезапустите бота: `systemctl restart lbgw-bot`
