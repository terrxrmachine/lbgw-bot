# Webhook Integration

## Настройка на сайте

Добавьте этот код на сайт для отправки уведомлений о новых отзывах:

```javascript
// Когда пользователь создаёт отзыв
async function notifyTelegramBot(reviewData) {
  const response = await fetch('http://YOUR_SERVER_IP:3001/webhook/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'lbgw_publish_reviews_secure_key_2025'
    },
    body: JSON.stringify({
      name: reviewData.name,
      text: reviewData.text,
      locale: reviewData.locale || 'ru',
      avatar: reviewData.avatar || null,
      photo: reviewData.photo || null
    })
  });

  return response.json();
}
```

## Формат данных

```json
{
  "name": "John Doe",
  "text": "Great service!",
  "locale": "en",
  "avatar": "https://example.com/avatar.jpg",
  "photo": "https://example.com/photo.jpg"
}
```

## Тестирование

```bash
curl -X POST http://localhost:3001/webhook/review \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lbgw_publish_reviews_secure_key_2025" \
  -d '{
    "name": "Test User",
    "text": "Test review from curl",
    "locale": "en"
  }'
```
