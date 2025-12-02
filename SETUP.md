# Инструкция по настройке LBGW Telegram Bot

## Шаг 1: Установка зависимостей

```bash
cd /Users/terrxrmachine/Documents/Работа/lbgw-bot
npm install
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните следующие значения в `.env`:

### Telegram Bot (обязательно)

```env
# Используем существующий бот
TELEGRAM_BOT_TOKEN=7616206547:AAGZX9Uu4As9UdM3Lth2dVE7J-cfMaffvS4
TELEGRAM_CHAT_ID=6626945924

# Канал для публикации одобренных отзывов (опционально)
# Формат: @channel_username или -100XXXXXXXXX (для супергрупп)
TELEGRAM_REVIEWS_CHANNEL=@your_reviews_channel
```

### LBGW Website API (обязательно)

```env
# URL сайта
LBGW_API_URL=http://localhost:3000
# или в production:
# LBGW_API_URL=https://luckybaligroup.com

# API ключ для публикации отзывов (должен совпадать с ключом на сайте)
REVIEWS_PUBLISH_API_KEY=lbgw_publish_reviews_secure_key_2025
```

### Yandex Metrica (опционально, для статистики)

```env
# ID счётчика Яндекс.Метрики
YM_COUNTER_ID=your_counter_id

# OAuth токен для доступа к API
YM_OAUTH_TOKEN=your_oauth_token
```

## Шаг 3: Получение OAuth токена Яндекс.Метрики

Если вы хотите использовать функцию статистики:

### 3.1. Регистрация приложения

1. Перейдите на https://oauth.yandex.ru/client/new
2. Заполните форму:
   - **Название**: LBGW Bot
   - **Платформа**: Веб-сервисы
   - **Redirect URI**: https://oauth.yandex.ru/verification_code
3. В разделе "Доступы" выберите:
   - ✅ Яндекс.Метрика (metrika:read)
4. Нажмите "Создать приложение"

### 3.2. Получение токена

1. Скопируйте **Client ID** вашего приложения
2. Перейдите по ссылке (подставьте свой Client ID):
   ```
   https://oauth.yandex.ru/authorize?response_type=token&client_id=YOUR_CLIENT_ID
   ```
3. Авторизуйтесь и разрешите доступ
4. Вы будете перенаправлены на страницу с `access_token` в URL
5. Скопируйте значение токена и вставьте в `.env` как `YM_OAUTH_TOKEN`

### 3.3. Найти ID счётчика

1. Перейдите в https://metrika.yandex.ru
2. Выберите свой сайт
3. ID счётчика отображается в URL: `https://metrika.yandex.ru/dashboard?id=XXXXXXXX`
4. Скопируйте этот ID в `.env` как `YM_COUNTER_ID`

## Шаг 4: Настройка канала для отзывов (опционально)

Если вы хотите автоматически публиковать одобренные отзывы в канал:

1. Создайте канал в Telegram
2. Добавьте вашего бота в администраторы канала с правом публикации сообщений
3. Укажите username канала в `.env`:
   ```env
   TELEGRAM_REVIEWS_CHANNEL=@your_channel_name
   ```

## Шаг 5: Запуск бота

### Development (с автоперезагрузкой)

```bash
npm run dev
```

### Production

```bash
# Сборка TypeScript
npm run build

# Запуск
npm start
```

Или используйте PM2 для автозапуска:

```bash
# Установка PM2
npm install -g pm2

# Запуск
pm2 start npm --name "lbgw-bot" -- start

# Автозапуск при перезагрузке сервера
pm2 startup
pm2 save
```

## Шаг 6: Проверка работы

### 6.1. Проверка подключения бота

Отправьте боту команду:
```
/start
```

Вы должны получить приветственное сообщение.

### 6.2. Проверка статистики (если настроена Метрика)

Отправьте команду:
```
/stats today
```

Вы должны получить отчёт за сегодня.

### 6.3. Проверка модерации отзывов

1. Перейдите на сайт и оставьте тестовый отзыв
2. В Telegram вы должны получить уведомление с кнопками
3. Нажмите "✅ Approve" или "❌ Reject"

## Устранение неполадок

### Бот не запускается

**Проблема**: `Missing required environment variables`

**Решение**: Проверьте, что все обязательные переменные в `.env` заполнены:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `LBGW_API_URL`
- `REVIEWS_PUBLISH_API_KEY`

### Статистика не работает

**Проблема**: `Не удалось получить данные из Яндекс.Метрики`

**Решение**: 
1. Проверьте, что `YM_COUNTER_ID` и `YM_OAUTH_TOKEN` указаны в `.env`
2. Проверьте, что токен имеет доступ к Метрике
3. Убедитесь, что счётчик установлен на сайте и собирает данные

### Отзывы не публикуются

**Проблема**: При нажатии кнопок отзывы не одобряются/отклоняются

**Решение**:
1. Проверьте, что сайт доступен по URL из `LBGW_API_URL`
2. Убедитесь, что `REVIEWS_PUBLISH_API_KEY` совпадает с ключом на сайте
3. Проверьте логи бота на наличие ошибок

### Отзывы не публикуются в канал

**Проблема**: Одобренные отзывы не появляются в канале

**Решение**:
1. Проверьте, что бот добавлен в администраторы канала
2. Убедитесь, что username канала указан правильно в `.env`
3. Для супергрупп используйте ID вместо username (формат: `-100XXXXXXXXX`)

## Полезные команды

```bash
# Просмотр логов (если используется PM2)
pm2 logs lbgw-bot

# Перезапуск бота
pm2 restart lbgw-bot

# Остановка бота
pm2 stop lbgw-bot

# Удаление из PM2
pm2 delete lbgw-bot

# Проверка статуса
pm2 status
```

## Безопасность

⚠️ **Важно**:
- Никогда не коммитьте файл `.env` в Git
- Храните API ключи в безопасности
- Используйте разные ключи для development и production
- Ограничьте доступ к боту только доверенным пользователям

## Дополнительная информация

- Документация Telegram Bot API: https://core.telegram.org/bots/api
- Документация Яндекс.Метрика API: https://yandex.ru/dev/metrika/doc/api2/api_v1/intro.html
- Документация node-telegram-bot-api: https://github.com/yagop/node-telegram-bot-api
