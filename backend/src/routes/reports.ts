import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/errors.js";
import { parse } from "../middleware/validate.js";
import { buildPayrollDocx } from "../reports/payrollDocx.js";
import { loadPayrollData } from "../reports/payrollData.js";
import { quarterLabel, type QuarterNumber } from "../reports/period.js";

const text = (max: number) => z.string().trim().min(1).max(max);

const PayrollBody = z.object({
  // Period covered is a calendar quarter, e.g. quarter 3 of 2026 = July to September 2026.
  year: z.number().int().min(2000).max(2100),
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  treasurer: text(100),
  checked_by_name: text(100),
  checked_by_title: text(100),
  noted_by_name: text(100),
  noted_by_title: text(100),
  noted_by_line: z.string().trim().max(100).optional(),
  branch_ids: z.array(z.number().int().positive()).max(500).optional(),
  // 26 rows fit on a page: up to 23 employees + the blank row + PAGE TOTAL
  // (+ GRAND TOTAL on the last page). 22 leaves room for names that wrap.
  rows_per_page: z.number().int().min(5).max(23).default(22),
});

export const reports = Router();

// POST /api/reports/payroll -> .docx download
reports.post("/payroll", async (req, res) => {
  const b = parse(PayrollBody, req.body);
  const quarter = { year: b.year, quarter: b.quarter as QuarterNumber };
  const periodCovered = quarterLabel(quarter);
  const branches = await loadPayrollData(quarter, b.branch_ids);

  let file: Buffer;
  try {
    file = await buildPayrollDocx(branches, {
      periodCovered,
      treasurer: b.treasurer,
      checkedBy: { name: b.checked_by_name, title: b.checked_by_title },
      notedBy: { name: b.noted_by_name, title: b.noted_by_title, line: b.noted_by_line || undefined },
      rowsPerPage: b.rows_per_page,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_PAYROLL_EMPLOYEES") {
      throw new HttpError(400, "No employees on payroll are in service during this quarter in the selected branches.");
    }
    throw err;
  }

  const filename = `Pasig City Payroll - ${periodCovered}`.replace(/[^\w\s.-]/g, "").trim() + ".docx";
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", file.length);
  res.send(file);
});
