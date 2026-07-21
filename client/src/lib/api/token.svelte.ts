/** The bearer token lives here rather than in the session store, so `request`
 *  can read it without importing a store that imports the api back. */
let token = $state<string | null>(null);

export const authToken = {
  get value(): string | null {
    return token;
  },
  set value(next: string | null) {
    token = next;
  },
};
