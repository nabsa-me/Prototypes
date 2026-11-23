/** Where viewer configurations are kept. Returns the raw document, unvalidated. */
export interface ViewerConfigStore {
  /** Resolves to `undefined` when no configuration exists for `id`. */
  read(id: string): Promise<unknown>;
}
