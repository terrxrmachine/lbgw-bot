import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Telegram Bot
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    reviewsChannel: process.env.TELEGRAM_REVIEWS_CHANNEL, // Optional
  },
  
  // LBGW Website API
  lbgw: {
    apiUrl: process.env.LBGW_API_URL || 'http://localhost:3000',
    reviewsPublishKey: process.env.REVIEWS_PUBLISH_API_KEY || '',
  },
  
  // Yandex Metrica
  yandex: {
    counterId: process.env.YM_COUNTER_ID || '',
    oauthToken: process.env.YM_OAUTH_TOKEN || '',
  },
  
  // Bot Settings
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
} as const;

// Validate required config
export function validateConfig(): void {
  const required = [
    { key: 'TELEGRAM_BOT_TOKEN', value: config.telegram.botToken },
    { key: 'TELEGRAM_CHAT_ID', value: config.telegram.chatId },
    { key: 'LBGW_API_URL', value: config.lbgw.apiUrl },
    { key: 'REVIEWS_PUBLISH_API_KEY', value: config.lbgw.reviewsPublishKey },
  ];
  
  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(({ key }) => `  - ${key}`).join('\n')}`
    );
  }
}
