import { NewReportSchema, TrackingCodeSchema } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendError, sendInvalidRequest } from '../../../http/replies.ts';
import { createReport, type CreateReportDeps } from '../application/create-report.ts';
import { ReportNotFoundError, getPublicReport } from '../application/get-public-report.ts';
import { OutsideCataloniaError } from '../domain/report.ts';

export type ReportRoutesDeps = CreateReportDeps;

const CodeParamsSchema = z.strictObject({ code: TrackingCodeSchema });

export function registerReportRoutes(app: FastifyInstance, deps: ReportRoutesDeps) {
  app.post('/api/reports', async (request, reply) => {
    const body = NewReportSchema.safeParse(request.body);
    if (!body.success) return sendInvalidRequest(reply, body.error);

    try {
      const created = createReport(deps, body.data);
      return reply.code(201).header('location', `/api/reports/${created.code}`).send(created);
    } catch (error) {
      if (error instanceof OutsideCataloniaError) {
        return sendError(reply, 422, 'outside_catalonia', error.message);
      }
      throw error;
    }
  });

  app.get('/api/reports/:code', async (request, reply) => {
    const params = CodeParamsSchema.safeParse(request.params);
    if (!params.success) return sendInvalidRequest(reply, params.error);

    try {
      return getPublicReport(deps, params.data.code);
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        return sendError(reply, 404, 'report_not_found', error.message);
      }
      throw error;
    }
  });
}
