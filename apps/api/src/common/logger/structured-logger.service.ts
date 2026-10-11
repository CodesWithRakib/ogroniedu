import { Injectable, LoggerService, Scope } from '@nestjs/common';

export interface StructuredLogPayload {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'verbose';
  context?: string;
  message: string;
  requestId?: string;
  meta?: Record<string, unknown>;
}

@Injectable({ scope: Scope.DEFAULT })
export class StructuredLoggerService implements LoggerService {
  private formatLog(
    level: StructuredLogPayload['level'],
    message: unknown,
    context?: string,
    meta?: Record<string, unknown>,
  ): string {
    const logObject: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      meta: meta ? this.maskPii(meta) : undefined,
    };

    return JSON.stringify(logObject);
  }

  public maskPii(data: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = { ...data };
    const sensitiveKeys = [
      'password',
      'token',
      'authorization',
      'secret',
      'pin',
      'nid',
      'otp',
      'cvv',
      'card',
      'bankaccount',
      'accountnumber',
      'cookie',
      'sessionid',
      'refreshtoken',
      'privatekey',
      'signature',
    ];

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'string') {
        let val = masked[key] as string;
        // Mask BD phone number format (+8801XXXXXXXXX or 01XXXXXXXXX)
        val = val.replace(/(?:\+?880|0)(1[3-9]\d{2})\d{4}(\d{2})/g, '$1****$2');
        // Mask email addresses (preserve first char and domain)
        val = val.replace(
          /([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g,
          '$1***@$2',
        );
        masked[key] = val;
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskPii(masked[key] as Record<string, unknown>);
      }
    }
    return masked;
  }

  log(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    console.log(this.formatLog('info', message, context, meta));
  }

  error(message: unknown, trace?: string, context?: string, meta?: Record<string, unknown>): void {
    const logMeta = { ...meta, trace };
    console.error(this.formatLog('error', message, context, logMeta));
  }

  warn(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatLog('warn', message, context, meta));
  }

  debug(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('debug', message, context, meta));
    }
  }

  verbose(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.info(this.formatLog('verbose', message, context, meta));
    }
  }
}
