/**
 * Centralized Logging System
 * Uses console for now, can be extended with Winston or other logging libraries
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    
    console.error(this.formatMessage(LogLevel.ERROR, message, { ...context, error: errorDetails }));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  // HTTP Request logging
  httpRequest(method: string, path: string, statusCode: number, duration?: number, context?: LogContext): void {
    const message = `${method} ${path} ${statusCode}${duration ? ` ${duration}ms` : ''}`;
    if (statusCode >= 500) {
      this.error(message, undefined, context);
    } else if (statusCode >= 400) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration?: number, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table}${duration ? ` ${duration}ms` : ''}`, context);
  }
}

export const logger = new Logger();

