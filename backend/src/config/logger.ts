export interface LogMeta {
  requestId?: string;
  userId?: string;
  module?: string;
  [key: string]: any;
}

export const logger = {
  info: (message: string, meta?: LogMeta) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ level: 'INFO', timestamp, message, ...meta }));
  },
  warn: (message: string, meta?: LogMeta) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({ level: 'WARN', timestamp, message, ...meta }));
  },
  error: (message: string, meta?: LogMeta) => {
    const timestamp = new Date().toISOString();
    console.error(JSON.stringify({ level: 'ERROR', timestamp, message, ...meta }));
  },
  debug: (message: string, meta?: LogMeta) => {
    if (process.env.LOG_LEVEL === 'debug') {
      const timestamp = new Date().toISOString();
      console.log(JSON.stringify({ level: 'DEBUG', timestamp, message, ...meta }));
    }
  },
};
