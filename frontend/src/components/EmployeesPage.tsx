"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { fullName } from "@/lib/format";
import { useDebounced, useList } from "@/lib/useList";
import type { Branch, Employee, EmployeeInput, Position } from "@/lib/types";
import {
  Alert,
  Button,
  card,
  ConfirmDelete,
  Field,
  inputClass,
  Modal,
  PageHeader,
  Pagination,
  TableState,
  td,
  th,
} from "./ui";

const LIMIT = 10;

type FormState = Omit<
  EmployeeInput,
  "branch_id" | "position_id" | "middle_name" | "suffix" | "date_hired" | "date_retired"
> & {
  middle_name: string;
  suffix: string;
  branch_id: string;
  position_id: string;
  date_hired: string; // "" when not set
  date_retired: string;
};

const emptyForm: FormState = {
  email: "",
  first_name: "",
  middle_name: "",
  suffix: "",
  last_name: "",
  branch_id: "",
  position_id: "",
  payroll_flag: false,
  date_hired: "",
  date_retired: "",
  retired_flag: false,
};

export function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [payrollFilter, setPayrollFilter] = useState("");
  const debouncedSearch = useDebounced(search);

  const { data, meta, loading, error, reload } = useList<Employee>("employees", {
    page,
    limit: LIMIT,
    search: debouncedSearch,
    branch_id: branchFilter,
    position_id: positionFilter,
    payroll_flag: payrollFilter,
  });

  // Options for the dropdowns (the API caps a page at 100 rows).
  const branches = useList<Branch>("branches", { limit: 100 });
  const positions = useList<Position>("positions", { limit: 100 });

  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openForm = (emp: Employee | "new") => {
    setEditing(emp);
    setForm(
      emp === "new"
        ? emptyForm
        : {
            email: emp.email,
            first_name: emp.first_name,
            middle_name: emp.middle_name ?? "",
            suffix: emp.suffix ?? "",
            last_name: emp.last_name,
            branch_id: String(emp.branch_id),
            position_id: String(emp.position_id),
            payroll_flag: emp.payroll_flag,
            date_hired: emp.date_hired ?? "",
            date_retired: emp.date_retired ?? "",
            retired_flag: emp.retired_flag,
          },
    );
    setFieldErrors({});
    setFormError(null);
  };

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});
    const payload: EmployeeInput = {
      ...form,
      middle_name: form.middle_name.trim() || null,
      suffix: form.suffix.trim() || null,
      branch_id: Number(form.branch_id),
      position_id: Number(form.position_id),
      date_hired: form.date_hired || null,
      // Unticking "Retired" clears the retirement date.
      date_retired: form.retired_flag ? form.date_retired || null : null,
    };
    try {
      if (editing === "new") await api.create("employees", payload);
      else if (editing) await api.update("employees", editing.id, payload);
      setEditing(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        setFormError(err.status === 409 ? "An employee with this email already exists." : err.message);
      } else {
        setFormError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.remove("employees", deleting.id);
      setDeleting(null);
      if (data.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  };

  const noOptions = !branches.loading && !positions.loading && (branches.data.length === 0 || positions.data.length === 0);

  return (
    <>
      <PageHeader title="Employees" action={<Button onClick={() => openForm("new")}>Add employee</Button>} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        />
        <select
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter by branch"
        >
          <option value="">All branches</option>
          {branches.data.map((b) => (
            <option key={b.id} value={b.id}>
              {b.branch_name}
            </option>
          ))}
        </select>
        <select
          value={positionFilter}
          onChange={(e) => {
            setPositionFilter(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter by position"
        >
          <option value="">All positions</option>
          {positions.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.position_name}
            </option>
          ))}
        </select>
        <select
          value={payrollFilter}
          onChange={(e) => {
            setPayrollFilter(e.target.value);
            setPage(1);
          }}
          className={inputClass}
          aria-label="Filter by payroll"
        >
          <option value="">Payroll: all</option>
          <option value="true">On payroll</option>
          <option value="false">Not on payroll</option>
        </select>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className={`${card} mt-4`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} hidden md:table-cell`}>Email</th>
                <th className={th}>Position</th>
                <th className={`${th} hidden sm:table-cell`}>Branch</th>
                <th className={`${th} hidden lg:table-cell`}>Payroll</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && data.length === 0 ? (
                <TableState colSpan={6}>Loading…</TableState>
              ) : data.length === 0 ? (
                <TableState colSpan={6}>No employees found.</TableState>
              ) : (
                data.map((emp) => (
                  <tr key={emp.id}>
                    <td className={td}>
                      <div className="font-medium">{fullName(emp)}</div>
                      <div className="text-xs text-zinc-500 md:hidden">{emp.email}</div>
                    </td>
                    <td className={`${td} hidden md:table-cell`}>{emp.email}</td>
                    <td className={td}>{emp.position?.position_name ?? "—"}</td>
                    <td className={`${td} hidden sm:table-cell`}>{emp.branch?.branch_name ?? "—"}</td>
                    <td className={`${td} hidden lg:table-cell`}>
                      {emp.payroll_flag ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          On payroll
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">No</span>
                      )}
                      {emp.retired_flag && (
                        <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Retired{emp.date_retired ? ` ${emp.date_retired}` : ""}
                        </span>
                      )}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <Button variant="ghost" onClick={() => openForm(emp)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setDeleting(emp);
                          setDeleteError(null);
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...meta} onPage={setPage} />
      </div>

      <Modal
        open={editing !== null}
        title={editing === "new" ? "Add employee" : "Edit employee"}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={submit} className="space-y-4">
          {noOptions && (
            <Alert>Add at least one branch and one position before adding employees.</Alert>
          )}
          <Field label="Email" error={fieldErrors.email?.[0]}>
            <input type="email" required maxLength={255} value={form.email} onChange={set("email")} className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={fieldErrors.first_name?.[0]}>
              <input required maxLength={50} value={form.first_name} onChange={set("first_name")} className={inputClass} />
            </Field>
            <Field label="Last name" error={fieldErrors.last_name?.[0]}>
              <input required maxLength={50} value={form.last_name} onChange={set("last_name")} className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Middle name (optional)" error={fieldErrors.middle_name?.[0]}>
              <input maxLength={50} value={form.middle_name} onChange={set("middle_name")} className={inputClass} />
            </Field>
            <Field label="Suffix (optional)" error={fieldErrors.suffix?.[0]}>
              <input
                maxLength={10}
                list="name-suffixes"
                placeholder="e.g. Jr."
                value={form.suffix}
                onChange={set("suffix")}
                className={inputClass}
              />
              <datalist id="name-suffixes">
                {["Jr.", "Sr.", "II", "III", "IV"].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Position" error={fieldErrors.position_id?.[0]}>
              <select required value={form.position_id} onChange={set("position_id")} className={inputClass}>
                <option value="">Select…</option>
                {positions.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch" error={fieldErrors.branch_id?.[0]}>
              <select required value={form.branch_id} onChange={set("branch_id")} className={inputClass}>
                <option value="">Select…</option>
                {branches.data.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.payroll_flag}
              onChange={(e) => setForm((f) => ({ ...f, payroll_flag: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
            />
            Include in payroll
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date hired (optional)" error={fieldErrors.date_hired?.[0]}>
              <input type="date" value={form.date_hired} onChange={set("date_hired")} className={inputClass} />
            </Field>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.retired_flag}
                  onChange={(e) => setForm((f) => ({ ...f, retired_flag: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                />
                Retired
              </label>
              {form.retired_flag && (
                <Field label="Date retired" error={fieldErrors.date_retired?.[0]}>
                  <input
                    type="date"
                    required
                    min={form.date_hired || undefined}
                    value={form.date_retired}
                    onChange={set("date_retired")}
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">
            The payroll pays for each month of the quarter from the hire month to the retirement month, both included.
          </p>
          {formError && <Alert>{formError}</Alert>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDelete
        open={deleting !== null}
        label={deleting ? fullName(deleting) : ""}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
