import type { ApiError } from '@fita/contracts';
import type { FastifyReply } from 'fastify';
import { z } from 'zod';

export function sendError(reply: FastifyReply, status: number, code: string, message: string) {
  const body: ApiError = { error: { code, message } };
  return reply.code(status).send(body);
}

export function sendInvalidRequest(reply: FastifyReply, error: z.ZodError) {
  return sendError(reply, 400, 'invalid_request', z.prettifyError(error));
}
