import { toast } from "svelte-sonner";
import {
  defaults,
  setMessage,
  superForm,
  type Infer,
  type SuperForm,
  type SuperValidated,
} from "sveltekit-superforms";
import { zod4, zod4Client } from "sveltekit-superforms/adapters";
import { ApiError } from "./api";

export { setError, setMessage } from "sveltekit-superforms";

type Message = App.Superforms.Message;

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** DOMException name for a thrown error, e.g. NotAllowedError from getUserMedia. */
export function errorName(err: unknown, fallback = "error"): string {
  return err instanceof Error && err.name ? err.name : fallback;
}

export const ok = (text: string): App.Superforms.Message => ({ type: "success", text });
export const fail = (text: string): App.Superforms.Message => ({ type: "error", text });

/** A form's `onUpdated`. Field errors stay inline; this is the form-wide outcome. */
export function toastMessage({
  form,
}: {
  form: SuperValidated<Record<string, unknown>, Message>;
}) {
  if (!form.message) return;
  const { type, text } = form.message;
  if (type === "error") toast.error(text);
  else toast.success(text);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = Parameters<typeof zod4>[0] & Record<any, any>;

interface SpaFormOptions<T extends Record<string, unknown>> {
  /** Runs once the form validates. Throw to trigger the error path below. */
  onValid: (data: T, form: SuperValidated<T, Message>) => void | Promise<void>;
  /** Custom failure handling (e.g. field-level errors); defaults to a toast/message. */
  onError?: (err: unknown, form: SuperValidated<T, Message>) => void;
  fallback?: string;
  resetForm?: boolean;
  /** Surface the form-wide message as a toast on completion. Defaults to true. */
  toast?: boolean;
}

/** A client-only superForm wired to a zod schema with our standard submit/catch flow. */
export function spaForm<S extends Schema>(
  schema: S,
  initial: Infer<S>,
  options: SpaFormOptions<Infer<S>>,
): SuperForm<Infer<S>, Message> {
  return superForm(defaults(initial, zod4(schema)), {
    SPA: true,
    validators: zod4Client(schema),
    resetForm: options.resetForm ?? false,
    onUpdate: async ({ form }) => {
      if (!form.valid) return;
      try {
        await options.onValid(form.data, form);
      } catch (err) {
        if (options.onError) options.onError(err, form);
        else
          setMessage(
            form,
            fail(apiErrorMessage(err, options.fallback ?? "something went wrong")),
          );
      }
    },
    onUpdated: options.toast === false ? undefined : toastMessage,
  });
}
