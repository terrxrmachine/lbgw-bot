import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

export interface Review {
  id: number;
  name: string;
  text: string;
  locale: string;
  avatar?: string | null;
  photo?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Путь к БД на сервере
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'reviews.db');
  }

  /**
   * Инициализация БД и создание таблиц
   */
  init(): void {
    try {
      // Создаем директорию для БД если её нет
      const dbDir = path.dirname(this.dbPath);
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

      // Создаем таблицу отзывов если её нет
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          text TEXT NOT NULL,
          locale TEXT DEFAULT 'ru',
          avatar TEXT,
          photo TEXT,
          status TEXT DEFAULT 'pending',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        )
      `);

      // Создаем индекс для быстрого поиска по статусу
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)
      `);

      logger.success(`Database initialized at ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize database', error as Error);
      throw error;
    }
  }

  /**
   * Создать новый отзыв
   */
  createReview(data: {
    name: string;
    text: string;
    locale?: string;
    avatar?: string;
    photo?: string;
  }): Review | null {
    if (!this.db) {
      logger.error('Database not initialized');
      return null;
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO reviews (name, text, locale, avatar, photo, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `);

      const result = stmt.run(
        data.name,
        data.text,
        data.locale || 'ru',
        data.avatar || null,
        data.photo || null
      );

      const reviewId = result.lastInsertRowid as number;

      logger.success(`Review #${reviewId} created`);

      return this.getReviewById(reviewId);
    } catch (error) {
      logger.error('Failed to create review', error as Error);
      return null;
    }
  }

  /**
   * Получить отзыв по ID
   */
  getReviewById(id: number): Review | null {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM reviews WHERE id = ?');
      const review = stmt.get(id) as Review | undefined;

      return review || null;
    } catch (error) {
      logger.error(`Failed to get review #${id}`, error as Error);
      return null;
    }
  }

  /**
   * Одобрить отзыв
   */
  approveReview(id: number): boolean {
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare(`
        UPDATE reviews
        SET status = 'approved', updatedAt = datetime('now')
        WHERE id = ?
      `);

      const result = stmt.run(id);

      if (result.changes > 0) {
        logger.success(`Review #${id} approved`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to approve review #${id}`, error as Error);
      return false;
    }
  }

  /**
   * Отклонить отзыв
   */
  rejectReview(id: number): boolean {
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare(`
        UPDATE reviews
        SET status = 'rejected', updatedAt = datetime('now')
        WHERE id = ?
      `);

      const result = stmt.run(id);

      if (result.changes > 0) {
        logger.success(`Review #${id} rejected`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to reject review #${id}`, error as Error);
      return false;
    }
  }

  /**
   * Получить статистику отзывов
   */
  getReviewsStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } {
    if (!this.db) {
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM reviews
      `);

      const stats = stmt.get() as any;

      return {
        total: stats.total || 0,
        pending: stats.pending || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
      };
    } catch (error) {
      logger.error('Failed to get reviews stats', error as Error);
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }
  }

  /**
   * Получить все отзывы с определенным статусом
   */
  getReviewsByStatus(status: 'pending' | 'approved' | 'rejected'): Review[] {
    if (!this.db) return [];

    try {
      const stmt = this.db.prepare('SELECT * FROM reviews WHERE status = ? ORDER BY createdAt DESC');
      return stmt.all(status) as Review[];
    } catch (error) {
      logger.error(`Failed to get ${status} reviews`, error as Error);
      return [];
    }
  }

  /**
   * Закрыть соединение с БД
   */
  close(): void {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

export const database = new DatabaseService();
