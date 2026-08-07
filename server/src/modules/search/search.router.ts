import { attachmentSearchQuery, searchQuery } from "@motus/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as searchController from "./search.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/", validate("query", searchQuery), searchController.search)
  .get(
    "/attachments",
    validate("query", attachmentSearchQuery),
    searchController.searchAttachments,
  );

export default router;
