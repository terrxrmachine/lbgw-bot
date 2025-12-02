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
}

export const lbgwApi = new LBGWApiService();
