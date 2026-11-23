import {
  ReportListQuerySchema,
  ReportStatusChangeSchema,
  TrackingCodeSchema,
  type ReportList,
} from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ADMIN_TOKEN_HEADER, isAdminToken } from '../../../http/admin-token.ts';
import { sendError, sendInvalidRequest } from '../../../http/replies.ts';
import { changeReportStatus } from '../application/change-report-status.ts';
import { ReportNotFoundError } from '../application/get-public-report.ts';
import { listReports } from '../application/list-reports.ts';
import {
  InvalidTransitionError,
  PublicNoteRequiredError,
  VersionConflictError,
} from '../domain/report.ts';
import type { Clock, ReportStore } from '../ports.ts';

export interface AdminReportRoutesDeps {
  store: ReportStore;
  clock: Clock;
  adminToken: string;
}

const CodeParamsSchema = z.strictObject({ code: TrackingCodeSchema });

/** Internal routes under /api/admin, all behind the shared admin token. */
export function registerAdminReportRoutes(app: FastifyInstance, deps: AdminReportRoutesDeps) {
  // An encapsulated plugin: the hook guards these routes only.
  void app.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (!isAdminToken(request.headers[ADMIN_TOKEN_HEADER], deps.adminToken)) {
        return sendError(reply, 401, 'unauthorized', 'A valid admin token is required');
      }
    });

    admin.get('/api/admin/reports', async (request, reply) => {
      const query = ReportListQuerySchema.safeParse(request.query);
      if (!query.success) return sendInvalidRequest(reply, query.error);

      const response: ReportList = { reports: listReports(deps, query.data) };
      return response;
    });

    admin.patch('/api/admin/reports/:code', async (request, reply) => {
      const params = CodeParamsSchema.safeParse(request.params);
      if (!params.success) return sendInvalidRequest(reply, params.error);
      const body = ReportStatusChangeSchema.safeParse(request.body);
      if (!body.success) return sendInvalidRequest(reply, body.error);

      try {
        return changeReportStatus(deps, params.data.code, body.data);
      } catch (error) {
        if (error instanceof ReportNotFoundError) {
          return sendError(reply, 404, 'report_not_found', error.message);
        }
        if (error instanceof VersionConflictError) {
          return sendError(reply, 409, 'version_conflict', error.message);
        }
        if (error instanceof InvalidTransitionError) {
          return sendError(reply, 409, 'invalid_transition', error.message);
        }
        if (error instanceof PublicNoteRequiredError) {
          return sendError(reply, 422, 'public_note_required', error.message);
        }
        throw error;
      }
    });
  });
}
