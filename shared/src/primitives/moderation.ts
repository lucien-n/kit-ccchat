import { z } from "zod";

/** How far back to purge a banned member's messages and reactions. `None` leaves
 *  their history in place; `All` removes everything they ever posted. */
export enum DeleteSpan {
  None = "none",
  Hour = "hour",
  Day = "day",
  Week = "week",
  All = "all",
}
export const deleteSpan = z.enum(DeleteSpan);
