import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class LBGWApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.lbgw.apiUrl;
    this.apiKey = config.lbgw.reviewsPublishKey;
  }

  /**
   * Публикует или отклоняет отзыв (через API сайта)
   */
  async publishReview(reviewId: number, action: 'approve' | 'reject'): Promise<boolean> {
    try {
      logger.info(`Publishing review #${reviewId} with action: ${action}`);

      // Отправляем запрос на API сайта для модерации
      const response = await axios.post(
        `${this.baseUrl}/api/reviews/moderate`,
        {
          reviewId,
          action,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          timeout: 5000,
        }
      );

      if (response.data?.success) {
        logger.success(`Review #${reviewId} ${action === 'approve' ? 'approved' : 'rejected'} on website`);
        return true;
      }

      logger.warn(`Failed to ${action} review #${reviewId}: ${response.data?.error || 'Unknown error'}`);
      return false;
    } catch (error) {
      logger.error(`Error publishing review #${reviewId}`, error as Error);
      return false;
    }
  }

  /**
   * Получает данные отзыва
   */
  async getReview(reviewId: number): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching review #${reviewId}`, error as Error);
      return null;
    }
  }

  /**
   * Получает статистику сайта (отзывы из API сайта)
   */
  async getSiteStats(): Promise<{
    reviews: {
      total: number;
      published: number;
      pending: number;
    };
    cms: {
      status: string;
      score: number;
      total: number;
      successful: number;
    };
  } | null> {
    try {
      logger.info('Fetching site statistics');

      // Получаем статистику отзывов через API сайта
      let reviewsStats = {
        total: 0,
        published: 0,
        pending: 0,
      };

      try {
        const statsResponse = await axios.get(`${this.baseUrl}/api/reviews/stats`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
          timeout: 3000,
        });

        if (statsResponse.data?.success) {
          reviewsStats = {
            total: statsResponse.data.total || 0,
            published: statsResponse.data.approved || 0,
            pending: statsResponse.data.pending || 0,
          };
        }
      } catch (error) {
        logger.warn('Could not fetch reviews stats from API');
      }

      // Пытаемся получить CMS health (если сайт доступен)
      let cmsStatus = {
        status: 'unknown',
        score: 0,
        total: 0,
        successful: 0,
      };

      try {
        const cmsResponse = await axios.get(`${this.baseUrl}/api/cms-health`, { timeout: 3000 });
        const cmsData = cmsResponse.data;
        cmsStatus = {
          status: cmsData.summary?.overall || 'unknown',
          score: cmsData.summary?.score || 0,
          total: cmsData.summary?.total || 0,
          successful: cmsData.summary?.successful || 0,
        };
      } catch (error) {
        logger.warn('Could not fetch CMS health, using default values');
      }

      return {
        reviews: reviewsStats,
        cms: cmsStatus,
      };
    } catch (error) {
      logger.error('Error fetching site statistics', error as Error);
      return null;
    }
  }
}

export const lbgwApi = new LBGWApiService();
