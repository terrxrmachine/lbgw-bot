# Инструкции по деплою бота на сервер

## 1. Подключение к серверу
```bash
ssh -i ~/.ssh/id_ed25519 root@217.26.25.113
```

## 2. Деплой бота

```bash
# Перейти в папку с ботом
cd /opt/lbgw-bot

# Скопировать файлы с локальной машины
# (выполнить на локальной машине)
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'node_modules' \
  --exclude 'data' \
  --exclude '.git' \
  /Users/terrxrmachine/Documents/Работа/lbgw-bot/ \
  root@217.26.25.113:/opt/lbgw-bot/

# На сервере: установить зависимости и собрать
npm install
npm run build

# Настроить .env
cat > .env << 'EOF'
TELEGRAM_BOT_TOKEN=7616206547:AAGZX9Uu4As9UdM3Lth2dVE7J-cfMaffvS4
TELEGRAM_CHAT_ID=6626945924
LBGW_API_URL=https://luckybaligroup.com
REVIEWS_PUBLISH_API_KEY=lbgw_publish_reviews_secure_key_2025
NODE_ENV=production
PORT=3001
EOF

# Создать папку для БД
mkdir -p /opt/lbgw-bot/data
```

## 3. Настройка systemd сервиса

```bash
# Создать systemd unit
cat > /etc/systemd/system/lbgw-bot.service << 'EOF'
[Unit]
Description=LBGW Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lbgw-bot
ExecStart=/usr/bin/node /opt/lbgw-bot/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lbgw-bot
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Перезагрузить systemd и запустить
systemctl daemon-reload
systemctl enable lbgw-bot
systemctl start lbgw-bot

# Проверить статус
systemctl status lbgw-bot

# Посмотреть логи
journalctl -u lbgw-bot -f
```

## 4. Обновление сайта для интеграции с ботом

```bash
cd /opt/lbgw

# Добавить переменные в .env.local
cat >> .env.local << 'EOF'

# Bot webhook
BOT_WEBHOOK_URL=http://localhost:3001/webhook/review
REVIEWS_PUBLISH_API_KEY=lbgw_publish_reviews_secure_key_2025
EOF

# Пересобрать и перезапустить сайт
npm run build
pm2 restart lbgw
```

## 5. Проверка работы

```bash
# Тест webhook бота
curl -X POST http://localhost:3001/webhook/review \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lbgw_publish_reviews_secure_key_2025" \
  -d '{
    "name": "Test User",
    "text": "Test review",
    "locale": "en"
  }'

# Проверить, что бот получил уведомление в Telegram
```

## 6. Управление ботом

```bash
# Перезапуск
systemctl restart lbgw-bot

# Остановка
systemctl stop lbgw-bot

# Просмотр логов
journalctl -u lbgw-bot -n 100

# Обновление кода
cd /opt/lbgw-bot
git pull  # или rsync с локальной машины
npm install
npm run build
systemctl restart lbgw-bot
```

## 7. Firewall (если нужно)

Порт 3001 слушает только localhost, внешний доступ не нужен.
