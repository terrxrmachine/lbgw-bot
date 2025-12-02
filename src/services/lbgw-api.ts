import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { database } from './database';

export class LBGWApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.lbgw.apiUrl;
    this.apiKey = config.lbgw.reviewsPublishKey;
  }

  /**
   * Публикует или отклоняет отзыв (работа с локальной БД)
   */
  async publishReview(reviewId: number, action: 'approve' | 'reject'): Promise<boolean> {
    try {
      logger.info(`Publishing review #${reviewId} with action: ${action}`);

      // Работаем с локальной БД
      const success = action === 'approve'
        ? database.approveReview(reviewId)
        : database.rejectReview(reviewId);

      if (success) {
        logger.success(`Review #${reviewId} ${action === 'approve' ? 'approved' : 'rejected'} in database`);
      }

      return success;
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
   * Получает статистику сайта (отзывы из БД)
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

      // Получаем статистику отзывов из локальной БД
      const dbStats = database.getReviewsStats();

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
        reviews: {
          total: dbStats.total,
          published: dbStats.approved,
          pending: dbStats.pending,
        },
        cms: cmsStatus,
      };
    } catch (error) {
      logger.error('Error fetching site statistics', error as Error);
      return null;
    }
  }
}

export const lbgwApi = new LBGWApiService();
