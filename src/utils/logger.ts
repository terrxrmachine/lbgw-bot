export class Logger {
  private prefix: string;

  constructor(prefix = 'LBGW-BOT') {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}`;
  }

  info(message: string): void {
    console.log(this.formatMessage('INFO', message));
  }

  error(message: string, error?: Error): void {
    console.error(this.formatMessage('ERROR', message));
    if (error) {
      console.error('Error details:', error);
    }
  }

  warn(message: string): void {
    console.warn(this.formatMessage('WARN', message));
  }

  debug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('DEBUG', message));
    }
  }

  success(message: string): void {
    console.log(this.formatMessage('SUCCESS', `✅ ${message}`));
  }
}

export const logger = new Logger();
