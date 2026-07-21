import { Hono } from "hono";
import { requireAuth, type Env } from "../../auth.js";
import * as searchController from "./search.controller.js";

const router = new Hono<Env>();

router.use("*", requireAuth);

router.get("/", searchController.search);

export default router;
