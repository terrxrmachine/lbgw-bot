export interface ReviewData {
  id: number;
  name: string;
  text: string;
  avatar?: string;
  locale: 'ru' | 'en' | 'id';
  provider?: string;
  date?: string;
}

export interface MetricaPeriod {
  type: 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface MetricsData {
  period: MetricaPeriod;
  visits: number;
  users: number;
  pageViews: number;
  topPages: Array<{
    url: string;
    views: number;
  }>;
  telegramClicks?: number;
}

export interface BotCommand {
  command: string;
  description: string;
  handler: (msg: any, args: string[]) => Promise<void>;
}

export interface CallbackData {
  action: 'approve' | 'reject';
  reviewId: number;
}
