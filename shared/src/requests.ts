// Request bodies and query parsers. The server validates with these; the
// client's forms are built from the same objects, so a rule can't drift between
// the two.

export * from "./requests/auth.js";
export * from "./requests/channels.js";
export * from "./requests/community.js";
export * from "./requests/messages.js";
export * from "./requests/moderation.js";
export * from "./requests/profile.js";
export * from "./requests/queries.js";
export * from "./requests/roles.js";
export * from "./requests/uploads.js";
