import TelegramBot from 'node-telegram-bot-api';
import { lbgwApi } from '../services/lbgw-api';
import { logger } from '../utils/logger';
import { config } from '../config';

export class ReviewsHandler {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * Обрабатывает callback от inline кнопок
   */
  async handleCallback(query: TelegramBot.CallbackQuery): Promise<void> {
    const { id, data, message } = query;

    if (!data || !message) {
      return;
    }

    // Парсим callback data: "review_approve_123" или "review_reject_123"
    const match = data.match(/^review_(approve|reject)_(\d+)$/);

    if (!match) {
      return;
    }

    const [, action, reviewIdStr] = match;
    const reviewId = parseInt(reviewIdStr, 10);

    logger.info(`Processing ${action} for review #${reviewId}`);

    try {
      // Отправляем запрос на API сайта
      const success = await lbgwApi.publishReview(
        reviewId,
        action as 'approve' | 'reject'
      );

      if (success) {
        // Обновляем сообщение
        const newText = action === 'approve'
          ? `✅ <b>Отзыв #${reviewId} опубликован</b>\n\n${this.extractReviewText(message.text || '')}`
          : `❌ <b>Отзыв #${reviewId} отклонён</b>\n\n${this.extractReviewText(message.text || '')}`;

        await this.bot.editMessageText(newText, {
          chat_id: message.chat.id,
          message_id: message.message_id,
          parse_mode: 'HTML',
        });

        // Отправляем подтверждение
        await this.bot.answerCallbackQuery(id, {
          text: action === 'approve' 
            ? '✅ Отзыв опубликован на сайте!' 
            : '❌ Отзыв отклонён и удалён',
        });

        // Если одобрен - публикуем в канал отзывов
        if (action === 'approve' && config.telegram.reviewsChannel) {
          await this.publishToChannel(reviewId, this.extractReviewText(message.text || ''));
        }
      } else {
        await this.bot.answerCallbackQuery(id, {
          text: '❌ Ошибка при обработке отзыва',
          show_alert: true,
        });
      }
    } catch (error) {
      logger.error(`Error handling callback for review #${reviewId}`, error as Error);
      await this.bot.answerCallbackQuery(id, {
        text: '❌ Произошла ошибка',
        show_alert: true,
      });
    }
  }

  /**
   * Публикует отзыв в канал
   */
  private async publishToChannel(reviewId: number, reviewText: string): Promise<void> {
    try {
      const channel = config.telegram.reviewsChannel;
      
      if (!channel) {
        logger.warn('Reviews channel not configured');
        return;
      }

      const message = [
        '⭐️ <b>Новый отзыв</b>',
        '',
        reviewText,
        '',
        `#отзыв #review${reviewId}`,
      ].join('\n');

      await this.bot.sendMessage(channel, message, {
        parse_mode: 'HTML',
      });

      logger.success(`Review #${reviewId} published to channel ${channel}`);
    } catch (error) {
      logger.error(`Error publishing review #${reviewId} to channel`, error as Error);
    }
  }

  /**
   * Извлекает текст отзыва из сообщения (убирает служебные части)
   */
  private extractReviewText(fullText: string): string {
    // Убираем заголовок "📝 New Review (Pending)"
    let text = fullText.replace(/<b>📝 New Review \(Pending\)<\/b>\n────────────────\n/, '');
    // Убираем последнюю строку с ID
    text = text.replace(/────────────────\n<b>Review ID:<\/b> \d+/, '');
    return text.trim();
  }
}
