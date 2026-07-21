import { searchQuery } from "@ccchat/shared";
import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import { validate } from "../../validate.js";
import * as searchController from "./search.controller.js";

const router = new Hono<Env>()
  .use("*", requireAuth)
  .get("/", validate("query", searchQuery), searchController.search);

export default router;
