import { toast } from 'svelte-sonner';
import type { SuperValidated } from 'sveltekit-superforms';
import { ApiError } from './api';

/** The server validates with the same schema the form does, so a 400 that gets
 *  here means a rule the client couldn't check — a taken username, a wrong
 *  password. Its message is written for humans; show it rather than a generic. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const ok = (text: string): App.Superforms.Message => ({ type: 'success', text });
export const fail = (text: string): App.Superforms.Message => ({ type: 'error', text });

/** Pass as a form's `onUpdated` to surface its message as a toast.
 *
 *  Field-level errors stay inline where the field is — a toast can't point at
 *  the input you got wrong. This is only for the form-wide outcome. */
export function toastMessage({
  form,
}: {
  form: SuperValidated<Record<string, unknown>, App.Superforms.Message>;
}) {
  if (!form.message) return;
  const { type, text } = form.message;
  if (type === 'error') toast.error(text);
  else toast.success(text);
}
