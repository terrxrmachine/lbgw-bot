import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { MetricaPeriod, MetricsData } from '../types';

export class YandexMetricaService {
  private counterId: string;
  private oauthToken: string;
  private baseUrl = 'https://api-metrika.yandex.net/stat/v1';

  constructor() {
    this.counterId = config.yandex.counterId;
    this.oauthToken = config.yandex.oauthToken;
  }

  /**
   * Парсит период из строки команды
   */
  parsePeriod(periodStr: string): MetricaPeriod {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    // today
    if (periodStr === 'today') {
      return {
        type: 'today',
        start: formatDate(today),
        end: formatDate(today),
      };
    }

    // yesterday
    if (periodStr === 'yesterday') {
      return {
        type: 'yesterday',
        start: formatDate(yesterday),
        end: formatDate(yesterday),
      };
    }

    // 7d
    if (periodStr === '7d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return {
        type: '7d',
        start: formatDate(start),
        end: formatDate(today),
      };
    }

    // 30d
    if (periodStr === '30d') {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return {
        type: '30d',
        start: formatDate(start),
        end: formatDate(today),
      };
    }

    // YYYY-MM (month)
    const monthMatch = periodStr.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const [, year, month] = monthMatch;
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of month

      return {
        type: 'month',
        start: formatDate(startDate),
        end: formatDate(endDate),
      };
    }

    // YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD (custom range)
    const rangeMatch = periodStr.match(/^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/);
    if (rangeMatch) {
      const [, start, end] = rangeMatch;
      return {
        type: 'custom',
        start,
        end: end || start,
      };
    }

    // Default to today
    return {
      type: 'today',
      start: formatDate(today),
      end: formatDate(today),
    };
  }

  /**
   * Получает метрики из Yandex Metrica
   */
  async getMetrics(period: MetricaPeriod): Promise<MetricsData | null> {
    try {
      if (!this.oauthToken || !this.counterId) {
        logger.warn('Yandex Metrica not configured');
        return null;
      }

      logger.info(`Fetching metrics for period: ${period.start} - ${period.end}`);

      // Общие метрики
      const summaryResponse = await axios.get(`${this.baseUrl}/data`, {
        params: {
          ids: this.counterId,
          date1: period.start,
          date2: period.end,
          metrics: 'ym:s:visits,ym:s:users,ym:s:pageviews',
          accuracy: 'full',
        },
        headers: {
          Authorization: `OAuth ${this.oauthToken}`,
        },
      });

      // ТОП страниц
      const pagesResponse = await axios.get(`${this.baseUrl}/data`, {
        params: {
          ids: this.counterId,
          date1: period.start,
          date2: period.end,
          dimensions: 'ym:s:startURL',
          metrics: 'ym:s:pageviews',
          sort: '-ym:s:pageviews',
          limit: 10,
          accuracy: 'full',
        },
        headers: {
          Authorization: `OAuth ${this.oauthToken}`,
        },
      });

      const summaryData = summaryResponse.data.totals || [0, 0, 0];
      const pagesData = pagesResponse.data.data || [];

      const topPages = pagesData.map((item: any) => ({
        url: item.dimensions[0].name,
        views: item.metrics[0],
      }));

      const metrics: MetricsData = {
        period,
        visits: summaryData[0] || 0,
        users: summaryData[1] || 0,
        pageViews: summaryData[2] || 0,
        topPages,
      };

      logger.success('Metrics fetched successfully');
      return metrics;
    } catch (error) {
      logger.error('Error fetching metrics', error as Error);
      return null;
    }
  }

  /**
   * Форматирует метрики для отправки в Telegram
   */
  formatMetrics(metrics: MetricsData): string {
    const { period, visits, users, pageViews, topPages } = metrics;

    const lines: string[] = [
      `📊 <b>Отчёт за ${period.start}${period.start !== period.end ? ` - ${period.end}` : ''}</b>`,
      '',
      `👥 <b>Посетители:</b> ${users.toLocaleString('ru-RU')}`,
      `🔄 <b>Визиты:</b> ${visits.toLocaleString('ru-RU')}`,
      `📄 <b>Просмотры:</b> ${pageViews.toLocaleString('ru-RU')}`,
      '',
      '<b>ТОП разделов:</b>',
    ];

    topPages.slice(0, 5).forEach((page, index) => {
      const urlPath = page.url.replace(/^https?:\/\/[^/]+/, '');
      lines.push(`${index + 1}. ${urlPath || '/'} — ${page.views.toLocaleString('ru-RU')}`);
    });

    return lines.join('\n');
  }

  /**
   * Получает метрики за предыдущую неделю (для cron отчётов)
   */
  async getWeeklyMetrics(): Promise<MetricsData | null> {
    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7) - 7);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);

    const period: MetricaPeriod = {
      type: 'custom',
      start: lastMonday.toISOString().split('T')[0],
      end: lastSunday.toISOString().split('T')[0],
    };

    return this.getMetrics(period);
  }
}

export const yandexMetrica = new YandexMetricaService();
