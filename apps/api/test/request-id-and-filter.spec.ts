import { describe, it, expect, vi } from 'vitest';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';

describe('RequestIdMiddleware and AllExceptionsFilter Tests', () => {
  describe('RequestIdMiddleware', () => {
    const middleware = new RequestIdMiddleware();

    it('should generate a new UUID v4 request ID when none is provided in headers', () => {
      const mockReq: Partial<Request> = {
        headers: {},
      };
      const headersSet: Record<string, string> = {};
      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
          return mockRes as Response;
        },
      };
      const next = vi.fn();

      middleware.use(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockReq.requestId).toBeDefined();
      expect(mockReq.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(headersSet['x-request-id']).toBe(mockReq.requestId);
    });

    it('should preserve incoming valid x-request-id from upstream gateway/load balancer', () => {
      const incomingId = 'upstream-request-trace-12345';
      const mockReq: Partial<Request> = {
        headers: { 'x-request-id': incomingId },
      };
      const headersSet: Record<string, string> = {};
      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
          return mockRes as Response;
        },
      };
      const next = vi.fn();

      middleware.use(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockReq.requestId).toBe(incomingId);
      expect(headersSet['x-request-id']).toBe(incomingId);
    });
  });

  describe('AllExceptionsFilter', () => {
    const filter = new AllExceptionsFilter();

    it('should format HttpException into canonical error envelope with code and requestId', () => {
      let responseStatus = 0;
      let responseBody: any = null;

      const mockRes: Partial<Response> = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          } as any;
        },
      };

      const mockReq: Partial<Request> = {
        url: '/api/v1/notifications',
        method: 'POST',
        requestId: 'req-test-999',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(new BadRequestException('Invalid payload submitted'), mockHost);

      expect(responseStatus).toBe(400);
      expect(responseBody).toBeDefined();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
      expect(responseBody.error.message).toBe('Invalid payload submitted');
      expect(responseBody.meta.requestId).toBe('req-test-999');
      expect(responseBody.meta.path).toBe('/api/v1/notifications');
      expect(responseBody.meta.method).toBe('POST');
      expect(responseBody.meta.timestamp).toBeDefined();
      expect(new Date(responseBody.meta.timestamp).getTime()).not.toBeNaN();
      expect(responseBody).not.toHaveProperty('stack');
    });

    it('sanitizes sensitive query parameters from meta.path in error envelopes', () => {
      let responseBody: any = null;
      const mockRes: Partial<Response> = {
        status: () =>
          ({
            json: (b: any) => {
              responseBody = b;
            },
          }) as any,
      };
      const mockReq: Partial<Request> = {
        url: '/api/v1/auth/reset?token=supersecret123&email=user%40example.com',
        method: 'GET',
        requestId: 'req-clean-1',
      };
      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(new BadRequestException('Link expired'), mockHost);

      expect(responseBody.meta.path).toContain('token=%5BREDACTED%5D');
      expect(responseBody.meta.path).not.toContain('supersecret123');
      expect(responseBody.meta.path).toContain('email=');
      expect(responseBody.meta.method).toBe('GET');
      expect(responseBody.meta.requestId).toBe('req-clean-1');
    });

    it('should sanitize generic unhandled errors to 500 status code', () => {
      let responseStatus = 0;
      let responseBody: any = null;

      const mockRes: Partial<Response> = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          } as any;
        },
      };

      const mockReq: Partial<Request> = {
        url: '/api/v1/unknown',
        method: 'GET',
        requestId: 'req-err-500',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(new Error('Database socket dropped'), mockHost);

      expect(responseStatus).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_ERROR');
      expect(responseBody.meta.requestId).toBe('req-err-500');
      // Sanitized: internal detail must not leak to clients
      expect(JSON.stringify(responseBody)).not.toContain('Database socket dropped');
    });

    it('maps a body-parser malformed-JSON error to 400 with a generated requestId', () => {
      let responseStatus = 0;
      let responseBody: any = null;
      const headersSet: Record<string, string> = {};

      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
          return mockRes as Response;
        },
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          } as any;
        },
      };

      // Simulates the express body-parser failure for malformed JSON,
      // which fires before RequestIdMiddleware (no request.requestId).
      const parseError = Object.assign(
        new SyntaxError('Unexpected token } in JSON at position 1'),
        {
          status: 400,
          statusCode: 400,
          type: 'entity.parse.failed',
        },
      );

      const mockReq: Partial<Request> = {
        url: '/api/v1/auth/login',
        method: 'POST',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(parseError, mockHost);

      expect(responseStatus).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
      expect(responseBody.error.message).toBe('The request body is not valid JSON.');
      expect(responseBody.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(headersSet['x-request-id']).toBe(responseBody.meta.requestId);
      // Sanitized: parser internals must not leak to clients
      expect(JSON.stringify(responseBody)).not.toContain('Unexpected token');
    });

    it('reports the Nest-mapped parse error (BadRequestException, no requestId) with a generated requestId', () => {
      let responseStatus = 0;
      let responseBody: any = null;
      const headersSet: Record<string, string> = {};

      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
          return mockRes as Response;
        },
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          } as any;
        },
      };

      // Built runtime: ExpressAdapter.mapException maps the body-parser
      // SyntaxError to BadRequestException(error.message) before filters run
      // (verified live against the dev server + @nestjs/platform-express 12).
      const mockReq: Partial<Request> = {
        url: '/api/v1/auth/login',
        method: 'POST',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(new BadRequestException('Unexpected end of JSON input'), mockHost);

      expect(responseStatus).toBe(400);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
      expect(responseBody.error.message).toBe('Unexpected end of JSON input');
      expect(responseBody.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(headersSet['x-request-id']).toBe(responseBody.meta.requestId);
    });

    it('keeps non-HttpException server-side failures sanitized even with a 5xx status field', () => {
      let responseStatus = 0;
      let responseBody: any = null;

      const mockRes: Partial<Response> = {
        status: (code: number) => {
          responseStatus = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          } as any;
        },
      };

      const upstreamError = Object.assign(new Error('connection reset by peer'), { status: 502 });
      const mockReq: Partial<Request> = {
        url: '/api/v1/tutors/search',
        method: 'GET',
        requestId: 'req-err-502',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(upstreamError, mockHost);

      expect(responseStatus).toBe(500);
      expect(responseBody.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(responseBody)).not.toContain('connection reset by peer');
    });
  });
});
