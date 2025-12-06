import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../utils/logger';

export class WebhookServer {
  private server: http.Server | null = null;
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * Запускает HTTP сервер для приёма webhook'ов
   */
  start(port: number = 3001): void {
    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Only accept POST requests to /webhook/review
      if (req.method !== 'POST' || req.url !== '/webhook/review') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      try {
        // Verify API key
        const apiKey = req.headers['x-api-key'] as string;
        if (apiKey !== config.lbgw.reviewsPublishKey) {
          logger.warn('Unauthorized webhook request');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Parse request body
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const reviewData = JSON.parse(body);
            logger.info(`Received review webhook: ${JSON.stringify(reviewData)}`);

            // Отправляем уведомление в Telegram
            await this.sendReviewNotification(reviewData);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              reviewId: reviewData.reviewId
            }));
          } catch (error) {
            logger.error('Error processing webhook', error as Error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request body' }));
          }
        });
      } catch (error) {
        logger.error('Error handling webhook request', error as Error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    this.server.listen(port, () => {
      logger.success(`Webhook server listening on port ${port}`);
      logger.info(`Webhook URL: http://localhost:${port}/webhook/review`);
    });
  }

  /**
   * Отправляет уведомление о новом отзыве в Telegram
   */
  private async sendReviewNotification(reviewData: any): Promise<void> {
    try {
      const localeFlags: Record<string, string> = {
        ru: '🇷🇺',
        en: '🇬🇧',
        id: '🇮🇩',
      };

      const localeNames: Record<string, string> = {
        ru: 'RU',
        en: 'EN',
        id: 'ID',
      };

      const text = [
        `<b>📝 New Review (Pending)</b>`,
        `────────────────`,
        `<b>Date:</b> ${new Date().toLocaleDateString('ru-RU')}`,
        `<b>Language:</b> ${localeFlags[reviewData.locale] || '🌐'} ${localeNames[reviewData.locale] || reviewData.locale.toUpperCase()}`,
        `<b>Name:</b> ${reviewData.name}`,
        `<b>Text:</b>\n${reviewData.text}`,
        `<b>Avatar:</b> ${reviewData.avatar ? '✅ yes' : '❌ no'}`,
        `<b>Photo:</b> ${reviewData.photo ? '✅ yes' : '❌ no'}`,
        `────────────────`,
        `<b>Review ID:</b> ${reviewData.reviewId}`,
      ].join('\n');

      const reply_markup = {
        inline_keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `review_approve_${reviewData.reviewId}`
            },
            {
              text: '❌ Reject',
              callback_data: `review_reject_${reviewData.reviewId}`
            }
          ]
        ]
      };

      await this.bot.sendMessage(config.telegram.chatId, text, {
        parse_mode: 'HTML',
        reply_markup,
      });

      logger.success(`Review notification sent for #${reviewData.reviewId}`);
    } catch (error) {
      logger.error('Error sending review notification', error as Error);
    }
  }

  /**
   * Останавливает webhook сервер
   */
  stop(): void {
    if (this.server) {
      this.server.close(() => {
        logger.info('Webhook server stopped');
      });
    }
  }
}
