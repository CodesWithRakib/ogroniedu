import { describe, it, expect, vi } from 'vitest';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
      expect(responseBody).not.toHaveProperty('stack');
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
  });
});
