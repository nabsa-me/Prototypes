import { ViewerConfigSchema, type ViewerConfig } from '@fita/contracts';
import { z } from 'zod';
import type { ViewerConfigStore } from '../ports.ts';

export class ViewerNotFoundError extends Error {
  constructor(readonly viewerId: string) {
    super(`Viewer "${viewerId}" does not exist`);
    this.name = 'ViewerNotFoundError';
  }
}

/** A configuration file in the repository breaks the contract: a defect, not a client error. */
export class InvalidViewerConfigError extends Error {
  constructor(viewerId: string, detail: string) {
    super(`Viewer "${viewerId}" has an invalid configuration:\n${detail}`);
    this.name = 'InvalidViewerConfigError';
  }
}

export async function getViewerConfig(
  deps: { store: ViewerConfigStore },
  viewerId: string,
): Promise<ViewerConfig> {
  const document = await deps.store.read(viewerId);
  if (document === undefined) throw new ViewerNotFoundError(viewerId);

  const result = ViewerConfigSchema.safeParse(document);
  if (!result.success) {
    throw new InvalidViewerConfigError(viewerId, z.prettifyError(result.error));
  }
  if (result.data.id !== viewerId) {
    throw new InvalidViewerConfigError(viewerId, `The file declares id "${result.data.id}"`);
  }
  return result.data;
}
