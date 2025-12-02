import TelegramBot from 'node-telegram-bot-api';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { CommandsHandler } from './handlers/commands';
import { ReviewsHandler } from './handlers/reviews';
import { database } from './services/database';

class LBGWBot {
  private bot: TelegramBot;
  private commandsHandler: CommandsHandler;
  private reviewsHandler: ReviewsHandler;

  constructor() {
    // Validate environment variables
    validateConfig();

    // Initialize database
    database.init();

    // Initialize bot
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });

    // Initialize handlers
    this.commandsHandler = new CommandsHandler(this.bot);
    this.reviewsHandler = new ReviewsHandler(this.bot);

    // Setup handlers
    this.setupHandlers();

    logger.success('LBGW Bot started successfully!');
  }

  private setupHandlers(): void {
    // Commands
    this.bot.onText(/\/start/, (msg) => {
      this.commandsHandler.handleStart(msg);
    });

    this.bot.onText(/\/help/, (msg) => {
      this.commandsHandler.handleHelp(msg);
    });

    this.bot.onText(/\/stats(?:\s+(.+))?/, (msg, match) => {
      const args = match?.[1] ? [match[1].trim()] : [];
      this.commandsHandler.handleStats(msg, args);
    });

    this.bot.onText(/\/site_stats/, (msg) => {
      this.commandsHandler.handleSiteStats(msg);
    });

    this.bot.onText(/\/test_review/, (msg) => {
      this.commandsHandler.handleTestReview(msg);
    });

    // Callback queries (inline buttons)
    this.bot.on('callback_query', (query) => {
      const data = query.data || '';

      // Отзывы: review_approve_* или review_reject_*
      if (data.startsWith('review_')) {
        this.reviewsHandler.handleCallback(query);
      }
      // Меню: menu_*, stats_*, back_to_menu
      else if (data.startsWith('menu_') || data.startsWith('stats_') || data === 'back_to_menu') {
        this.commandsHandler.handleMenuCallback(query);
      }
    });

    // Unknown commands
    this.bot.on('message', (msg) => {
      if (msg.text?.startsWith('/')) {
        const knownCommands = ['/start', '/help', '/stats', '/site_stats', '/test_review'];
        const command = msg.text.split(' ')[0];
        if (!knownCommands.includes(command)) {
          this.commandsHandler.handleUnknown(msg);
        }
      }
    });

    // Error handling
    this.bot.on('polling_error', (error) => {
      logger.error('Polling error', error);
    });

    logger.info('Bot handlers registered');
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    logger.info('Stopping bot...');
    await this.bot.stopPolling();
    database.close();
    logger.success('Bot stopped');
  }
}

// Start bot
const bot = new LBGWBot();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM');
  await bot.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason as Error);
  process.exit(1);
});
