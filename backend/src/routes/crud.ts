import { Router } from "express";
import type { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { fromPostgrest, HttpError, notFound } from "../lib/errors.js";
import { IdParam, parse } from "../middleware/validate.js";

type ListQuery = { page: number; limit: number; search?: string } & Record<string, unknown>;

interface CrudConfig<Q extends ListQuery> {
  table: string;
  label: string; // used in error messages, e.g. "Branch"
  select: string; // PostgREST select (can include joins)
  orderBy: string;
  createSchema: z.ZodType;
  updateSchema: z.ZodType;
  listSchema: z.ZodType<Q>;
  searchColumns: string[];
  // Extra equality filters taken from the query string (e.g. branch_id)
  filterColumns?: (keyof Q & string)[];
}

// Strip characters that have meaning inside a PostgREST or() filter.
const sanitizeSearch = (s: string) => s.replace(/[,()*%\\]/g, " ").trim();

export function crudRouter<Q extends ListQuery>(cfg: CrudConfig<Q>) {
  const router = Router();

  // LIST: GET /?page=&limit=&search=&<filters>
  router.get("/", async (req, res) => {
    const q = parse(cfg.listSchema, req.query);
    const from = (q.page - 1) * q.limit;

    let query = supabase
      .from(cfg.table)
      .select(cfg.select, { count: "exact" })
      .order(cfg.orderBy, { ascending: true })
      .range(from, from + q.limit - 1);

    for (const col of cfg.filterColumns ?? []) {
      if (q[col] !== undefined) query = query.eq(col as string, q[col] as string | number | boolean);
    }

    const term = q.search ? sanitizeSearch(q.search) : "";
    if (term) {
      query = query.or(cfg.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(","));
    }

    const { data, error, count } = await query;
    if (error) throw fromPostgrest(error);
    res.json({ data, meta: { page: q.page, limit: q.limit, total: count ?? 0 } });
  });

  // READ: GET /:id
  router.get("/:id", async (req, res) => {
    const { id } = parse(IdParam, req.params);
    const { data, error } = await supabase.from(cfg.table).select(cfg.select).eq("id", id).maybeSingle();
    if (error) throw fromPostgrest(error);
    if (!data) throw notFound(cfg.label, id);
    res.json({ data });
  });

  // CREATE: POST /
  router.post("/", async (req, res) => {
    const body = parse(cfg.createSchema, req.body) as Record<string, unknown>;
    const { data, error } = await supabase.from(cfg.table).insert(body).select(cfg.select).single();
    if (error) throw fromPostgrest(error);
    res.status(201).json({ data });
  });

  // UPDATE (partial): PATCH /:id
  router.patch("/:id", async (req, res) => {
    const { id } = parse(IdParam, req.params);
    const body = parse(cfg.updateSchema, req.body) as Record<string, unknown>;
    if (Object.keys(body).length === 0) throw new HttpError(400, "Request body has no fields to update");

    const { data, error } = await supabase
      .from(cfg.table)
      .update(body)
      .eq("id", id)
      .select(cfg.select)
      .maybeSingle();
    if (error) throw fromPostgrest(error);
    if (!data) throw notFound(cfg.label, id);
    res.json({ data });
  });

  // DELETE: DELETE /:id
  router.delete("/:id", async (req, res) => {
    const { id } = parse(IdParam, req.params);
    const { data, error } = await supabase.from(cfg.table).delete().eq("id", id).select("id").maybeSingle();
    if (error) throw fromPostgrest(error);
    if (!data) throw notFound(cfg.label, id);
    res.status(204).end();
  });

  return router;
}
