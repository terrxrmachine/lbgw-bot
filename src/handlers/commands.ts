import TelegramBot from 'node-telegram-bot-api';
import { yandexMetrica } from '../services/yandex-metrica';
import { lbgwApi } from '../services/lbgw-api';
import { database } from '../services/database';
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
      'Выберите действие:',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Статистика сайта', callback_data: 'menu_site_stats' },
        ],
        [
          { text: '📈 Яндекс.Метрика', callback_data: 'menu_yandex_stats' },
        ],
        [
          { text: '❓ Справка', callback_data: 'menu_help' },
        ],
      ],
    };

    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
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
   * Обработка callback от меню
   */
  async handleMenuCallback(query: TelegramBot.CallbackQuery): Promise<void> {
    const { id, data, message } = query;

    if (!data || !message) {
      return;
    }

    const chatId = message.chat.id;

    try {
      // Обрабатываем нажатия на кнопки меню
      if (data === 'menu_site_stats') {
        await this.bot.answerCallbackQuery(id);
        await this.handleSiteStats(message);
      } else if (data === 'menu_yandex_stats') {
        await this.bot.answerCallbackQuery(id);
        await this.showYandexStatsMenu(message);
      } else if (data === 'menu_help') {
        await this.bot.answerCallbackQuery(id);
        await this.handleHelp(message);
      } else if (data.startsWith('stats_')) {
        // Обработка выбора периода статистики
        const period = data.replace('stats_', '');
        await this.bot.answerCallbackQuery(id);
        await this.handleStats(message, [period]);
      } else if (data === 'back_to_menu') {
        await this.bot.answerCallbackQuery(id);
        await this.bot.deleteMessage(chatId, message.message_id);
        await this.handleStart(message);
      }
    } catch (error) {
      logger.error('Error handling menu callback', error as Error);
      await this.bot.answerCallbackQuery(id, {
        text: '❌ Произошла ошибка',
        show_alert: true,
      });
    }
  }

  /**
   * Показывает меню выбора периода для Яндекс.Метрики
   */
  async showYandexStatsMenu(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const text = [
      '📈 <b>Статистика Яндекс.Метрики</b>',
      '',
      'Выберите период:',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📅 Сегодня', callback_data: 'stats_today' },
          { text: '📅 Вчера', callback_data: 'stats_yesterday' },
        ],
        [
          { text: '📊 7 дней', callback_data: 'stats_7d' },
          { text: '📊 30 дней', callback_data: 'stats_30d' },
        ],
        [
          { text: '🔙 Назад', callback_data: 'back_to_menu' },
        ],
      ],
    };

    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  /**
   * /test_review - Создает тестовый отзыв в БД и отправляет уведомление
   */
  async handleTestReview(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      // Создаем реальный отзыв в БД
      const review = database.createReview({
        name: 'Test User',
        text: 'This is a test review to check if the bot notifications are working correctly!',
        locale: 'en',
      });

      if (!review) {
        await this.bot.sendMessage(
          chatId,
          '❌ Не удалось создать тестовый отзыв в БД',
          { parse_mode: 'HTML' }
        );
        return;
      }

      const text = [
        `<b>📝 New Review (Pending)</b>`,
        `────────────────`,
        `<b>Date:</b> ${new Date(review.createdAt).toLocaleDateString('ru-RU')}`,
        `<b>Language:</b> 🇬🇧 EN`,
        `<b>Name:</b> ${review.name}`,
        `<b>Text:</b>\n${review.text}`,
        `<b>Avatar:</b> ${review.avatar ? '✅ yes' : '❌ no'}`,
        `<b>Photo:</b> ${review.photo ? '✅ yes' : '❌ no'}`,
        `────────────────`,
        `<b>Review ID:</b> ${review.id}`,
      ].join('\n');

      const reply_markup = {
        inline_keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `review_approve_${review.id}`
            },
            {
              text: '❌ Reject',
              callback_data: `review_reject_${review.id}`
            }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup,
      });

      logger.success(`Test review #${review.id} created and notification sent`);
    } catch (error) {
      logger.error('Error creating test review', error as Error);
      await this.bot.sendMessage(
        chatId,
        '❌ Ошибка при создании тестового отзыва',
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
