import { Router } from "express";
import { crudRouter } from "./crud.js";
import { reports } from "./reports.js";
import {
  BranchCreate,
  BranchUpdate,
  EmployeeCreate,
  EmployeeQuery,
  EmployeeUpdate,
  NameQuery,
  PositionCreate,
  PositionUpdate,
} from "../schemas/index.js";

export const api = Router();

api.use("/reports", reports);

api.use(
  "/branches",
  crudRouter({
    table: "branches",
    label: "Branch",
    // branches and employees are linked in two directions, so name the column to follow.
    select: [
      "*",
      "signatory_one_employee:employees!signatory_one(id, first_name, middle_name, last_name, suffix)",
      "signatory_two_employee:employees!signatory_two(id, first_name, middle_name, last_name, suffix)",
    ].join(", "),
    orderBy: "branch_name",
    createSchema: BranchCreate,
    updateSchema: BranchUpdate,
    listSchema: NameQuery,
    searchColumns: ["branch_name"],
  }),
);

api.use(
  "/positions",
  crudRouter({
    table: "positions",
    label: "Position",
    select: "*",
    orderBy: "position_name",
    createSchema: PositionCreate,
    updateSchema: PositionUpdate,
    listSchema: NameQuery,
    searchColumns: ["position_name"],
  }),
);

api.use(
  "/employees",
  crudRouter({
    table: "employees",
    label: "Employee",
    // Embed the related branch and position so the frontend can show names directly.
    // "!branch_id" picks employees.branch_id, not the branch signatory links.
    select: "*, branch:branches!branch_id(id, branch_name), position:positions(id, position_name)",
    orderBy: "last_name",
    createSchema: EmployeeCreate,
    updateSchema: EmployeeUpdate,
    listSchema: EmployeeQuery,
    searchColumns: ["first_name", "middle_name", "last_name", "email"],
    filterColumns: ["branch_id", "position_id", "payroll_flag", "retired_flag"],
  }),
);
