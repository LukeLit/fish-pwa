/**
 * Development Logger - Verbose logging for debugging cache and sync issues
 * 
 * Only logs in development mode to avoid polluting production logs.
 * Includes timestamps for tracking timing issues.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_COLORS: Record<LogLevel, string> = {
  info: '#3b82f6',   // blue
  warn: '#f59e0b',   // amber
  error: '#ef4444',  // red
  debug: '#8b5cf6',  // purple
};

/**
 * Log a development message with category and timestamp
 * 
 * @param category - Log category (e.g., 'Cache', 'Save', 'Fetch')
 * @param message - Log message
 * @param data - Optional data to log
 * @param level - Log level (info, warn, error, debug)
 */
export function devLog(
  category: string,
  message: string,
  data?: unknown,
  level: LogLevel = 'info'
) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const prefix = `[${category}] ${timestamp}`;

  const logFn = level === 'error' 
    ? console.error 
    : level === 'warn' 
      ? console.warn 
      : console.log;

  if (data !== undefined) {
    logFn(`%c${prefix}%c - ${message}`, `color: ${color}; font-weight: bold`, 'color: inherit', data);
  } else {
    logFn(`%c${prefix}%c - ${message}`, `color: ${color}; font-weight: bold`, 'color: inherit');
  }
}

/**
 * Log cache-related operations
 */
export function devLogCache(message: string, data?: unknown) {
  devLog('Cache', message, data, 'debug');
}

/**
 * Log save operations
 */
export function devLogSave(message: string, data?: unknown) {
  devLog('Save', message, data, 'info');
}

/**
 * Log fetch/load operations
 */
export function devLogFetch(message: string, data?: unknown) {
  devLog('Fetch', message, data, 'info');
}

/**
 * Log sync state changes
 */
export function devLogSync(message: string, data?: unknown) {
  devLog('Sync', message, data, 'info');
}

/**
 * Log errors in development
 */
export function devLogError(category: string, message: string, error?: unknown) {
  devLog(category, message, error, 'error');
}

/**
 * Time an async operation and log the duration
 */
export async function devTimeAsync<T>(
  category: string,
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return operation();
  }

  const startTime = performance.now();
  devLog(category, `Starting: ${operationName}`);

  try {
    const result = await operation();
    const duration = Math.round(performance.now() - startTime);
    devLog(category, `Completed: ${operationName} (${duration}ms)`, undefined, 'info');
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    devLog(category, `Failed: ${operationName} (${duration}ms)`, error, 'error');
    throw error;
  }
}
