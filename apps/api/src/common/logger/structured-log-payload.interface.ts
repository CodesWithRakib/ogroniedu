export interface StructuredLogPayload {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'verbose';
  context?: string;
  message: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}
