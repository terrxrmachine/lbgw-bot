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
   * Публикует или отклоняет отзыв
   */
  async publishReview(reviewId: number, action: 'approve' | 'reject'): Promise<boolean> {
    try {
      logger.info(`Publishing review #${reviewId} with action: ${action}`);
      
      const response = await axios.post(
        `${this.baseUrl}/api/reviews/publish`,
        { reviewId, action },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
        }
      );

      if (response.data.success) {
        logger.success(`Review #${reviewId} ${action === 'approve' ? 'published' : 'rejected'}`);
        return true;
      }

      logger.error(`Failed to publish review #${reviewId}`, new Error(response.data.error));
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
   * Получает статистику сайта (отзывы и CMS health)
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

      // Получаем статистику отзывов
      const reviewsResponse = await axios.get(`${this.baseUrl}/api/reviews?pageSize=1000`);
      const allReviews = reviewsResponse.data.items || [];

      // Подсчитываем опубликованные и на модерации
      // На сайте опубликованные отзывы приходят только через publicationState=live
      const publishedCount = allReviews.length;

      // Для подсчета всех отзывов (включая черновики) нужен прямой доступ к Strapi
      // Пока используем примерную оценку
      const totalCount = publishedCount; // Реальное значение можно получить только из Strapi напрямую
      const pendingCount = 0; // Черновики не доступны через публичное API

      // Получаем CMS health
      const cmsResponse = await axios.get(`${this.baseUrl}/api/cms-health`);
      const cmsData = cmsResponse.data;

      return {
        reviews: {
          total: totalCount,
          published: publishedCount,
          pending: pendingCount,
        },
        cms: {
          status: cmsData.summary?.overall || 'unknown',
          score: cmsData.summary?.score || 0,
          total: cmsData.summary?.total || 0,
          successful: cmsData.summary?.successful || 0,
        },
      };
    } catch (error) {
      logger.error('Error fetching site statistics', error as Error);
      return null;
    }
  }
}

export const lbgwApi = new LBGWApiService();
