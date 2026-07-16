import { toast } from 'svelte-sonner';
import type { SuperValidated } from 'sveltekit-superforms';
import { ApiError } from './api';

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const ok = (text: string): App.Superforms.Message => ({ type: 'success', text });
export const fail = (text: string): App.Superforms.Message => ({ type: 'error', text });

/** A form's `onUpdated`. Field errors stay inline; this is the form-wide outcome. */
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
