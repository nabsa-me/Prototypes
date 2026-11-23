import { ReportListQuerySchema, type ReportList } from '@fita/contracts';
import type { FastifyInstance } from 'fastify';
import { ADMIN_TOKEN_HEADER, isAdminToken } from '../../../http/admin-token.ts';
import { sendError, sendInvalidRequest } from '../../../http/replies.ts';
import { listReports } from '../application/list-reports.ts';
import type { ReportStore } from '../ports.ts';

export interface AdminReportRoutesDeps {
  store: ReportStore;
  adminToken: string;
}

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
  });
}
