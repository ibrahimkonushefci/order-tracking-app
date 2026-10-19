/** What every Phase 3 server action returns to its form. */
export interface ActionResult {
  ok?: boolean;
  /** Field name → Albanian message; `_` is for the whole form. */
  errors?: Record<string, string>;
  toast?: string;
  /** Where to go next (e.g. the new order). */
  go?: string;
}
