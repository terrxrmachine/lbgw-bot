import TelegramBot from 'node-telegram-bot-api';
import { yandexMetrica } from '../services/yandex-metrica';
import { lbgwApi } from '../services/lbgw-api';
import { logger } from '../utils/logger';

export class CommandsHandler {
  private bot: TelegramBot;

  constructor(bot: TelegramBot) {
    this.bot = bot;
  }

  /**
   * /start - Приветствие
   */
  async handleStart(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const text = [
      '👋 <b>Привет! Я бот Lucky Bali Group</b>',
      '',
      'Я помогаю управлять отзывами и просматривать статистику сайта.',
      '',
      '<b>Доступные команды:</b>',
      '/stats [период] — Статистика Яндекс.Метрики',
      '/site_stats — Статистика сайта (отзывы, CMS)',
      '/help — Помощь по использованию',
      '',
      '<b>Примеры периодов для /stats:</b>',
      '• today — сегодня',
      '• yesterday — вчера',
      '• 7d — последние 7 дней',
      '• 30d — последние 30 дней',
      '• 2025-01 — январь 2025',
      '• 2025-01-15 — конкретный день',
      '• 2025-01-01..2025-01-31 — диапазон дат',
    ].join('\n');

    await this.bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  /**
   * /help - Справка
   */
  async handleHelp(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const text = [
      '📖 <b>Справка по использованию бота</b>',
      '',
      '<b>Управление отзывами:</b>',
      'Когда пользователь оставляет отзыв на сайте, вы получаете уведомление с кнопками:',
      '✅ Approve — Опубликовать отзыв на сайте и в канале',
      '❌ Reject — Отклонить и удалить отзыв',
      '',
      '<b>Статистика сайта:</b>',
      '/stats [период] — Получить отчёт за указанный период',
      '',
      '<b>Форматы периода:</b>',
      '• today, yesterday — сегодня/вчера',
      '• 7d, 30d — последние 7/30 дней',
      '• YYYY-MM — конкретный месяц (2025-01)',
      '• YYYY-MM-DD — конкретный день (2025-01-15)',
      '• YYYY-MM-DD..YYYY-MM-DD — диапазон дат',
      '',
      '<b>Примеры:</b>',
      '/stats today',
      '/stats 30d',
      '/stats 2025-01',
      '/stats 2025-01-01..2025-01-31',
      '',
      '<b>Что показывает отчёт:</b>',
      '• Количество посетителей',
      '• Количество визитов',
      '• Количество просмотров страниц',
      '• ТОП 5 самых популярных разделов',
    ].join('\n');

    await this.bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  /**
   * /stats - Статистика
   */
  async handleStats(msg: TelegramBot.Message, args: string[]): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Период по умолчанию - today
      const periodStr = args[0] || 'today';

      // Отправляем сообщение о загрузке
      const loadingMsg = await this.bot.sendMessage(
        chatId,
        '⏳ Получаю данные из Яндекс.Метрики...',
        { parse_mode: 'HTML' }
      );

      // Парсим период
      const period = yandexMetrica.parsePeriod(periodStr);

      // Получаем метрики
      const metrics = await yandexMetrica.getMetrics(period);

      if (!metrics) {
        await this.bot.editMessageText(
          '❌ Не удалось получить данные из Яндекс.Метрики. Проверьте настройки.',
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'HTML',
          }
        );
        return;
      }

      // Форматируем и отправляем
      const text = yandexMetrica.formatMetrics(metrics);

      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'HTML',
      });

      logger.success(`Stats sent for period: ${periodStr}`);
    } catch (error) {
      logger.error('Error handling /stats command', error as Error);
      await this.bot.sendMessage(
        chatId,
        '❌ Произошла ошибка при получении статистики',
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * /site_stats - Статистика сайта (отзывы, CMS health)
   */
  async handleSiteStats(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Отправляем сообщение о загрузке
      const loadingMsg = await this.bot.sendMessage(
        chatId,
        '⏳ Получаю статистику сайта...',
        { parse_mode: 'HTML' }
      );

      // Получаем статистику с сайта через API
      const siteStats = await lbgwApi.getSiteStats();

      if (!siteStats) {
        await this.bot.editMessageText(
          '❌ Не удалось получить статистику сайта. Проверьте, что сайт доступен.',
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'HTML',
          }
        );
        return;
      }

      const { reviews, cms } = siteStats;

      const text = [
        '📊 <b>Статистика сайта Lucky Bali Group</b>',
        '',
        '<b>📝 Отзывы:</b>',
        `• Всего: ${reviews.total}`,
        `• Опубликовано: ${reviews.published}`,
        `• На модерации: ${reviews.pending}`,
        '',
        '<b>🖥 CMS (Strapi):</b>',
        `• Статус: ${cms.status === 'healthy' ? '✅ Работает' : '⚠️ Проблемы'}`,
        `• Оценка: ${cms.score}%`,
        `• Успешных эндпоинтов: ${cms.successful}/${cms.total}`,
        '',
        `<i>Обновлено: ${new Date().toLocaleString('ru-RU')}</i>`,
      ].join('\n');

      await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'HTML',
      });

      logger.success('Site stats sent');
    } catch (error) {
      logger.error('Error handling /site_stats command', error as Error);
      await this.bot.sendMessage(
        chatId,
        '❌ Произошла ошибка при получении статистики сайта',
        { parse_mode: 'HTML' }
      );
    }
  }

  /**
   * Неизвестная команда
   */
  async handleUnknown(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(
      chatId,
      '❓ Неизвестная команда. Используйте /help для справки.',
      { parse_mode: 'HTML' }
    );
  }
}
