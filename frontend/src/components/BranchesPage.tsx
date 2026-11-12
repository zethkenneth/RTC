"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { fullName } from "@/lib/format";
import { useAll, useDebounced, useList } from "@/lib/useList";
import type { Branch, BranchInput, Employee } from "@/lib/types";
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

export function BranchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const { data, meta, loading, error, reload } = useList<Branch>("branches", {
    page,
    limit: LIMIT,
    search: debouncedSearch,
  });

  const [editing, setEditing] = useState<Branch | "new" | null>(null);

  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.remove("branches", deleting.id);
      setDeleting(null);
      if (data.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError && err.status === 409
          ? "This branch still has employees assigned. Reassign them first."
          : err instanceof Error
            ? err.message
            : "Delete failed",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const signatoryCell = (e: Branch["signatory_one_employee"]) =>
    e ? fullName(e) : <span className="text-zinc-400">Not set</span>;

  return (
    <>
      <PageHeader title="Branches" action={<Button onClick={() => setEditing("new")}>Add branch</Button>} />

      <input
        type="search"
        placeholder="Search branches…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className={`${inputClass} mb-4 max-w-sm`}
      />

      {error && <Alert>{error}</Alert>}

      <div className={`${card} mt-4`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} hidden sm:table-cell`}>Signatory 1</th>
                <th className={`${th} hidden sm:table-cell`}>Signatory 2</th>
                <th className={`${th} hidden lg:table-cell`}>Last updated</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && data.length === 0 ? (
                <TableState colSpan={5}>Loading…</TableState>
              ) : data.length === 0 ? (
                <TableState colSpan={5}>No branches found.</TableState>
              ) : (
                data.map((b) => (
                  <tr key={b.id}>
                    <td className={td}>
                      <div className="font-medium">{b.branch_name}</div>
                      {/* On small screens the signatory columns are hidden, so show them here. */}
                      <div className="text-xs text-zinc-500 sm:hidden">
                        {[b.signatory_one_employee, b.signatory_two_employee]
                          .filter((e) => e !== null)
                          .map(fullName)
                          .join(", ") || "No signatories"}
                      </div>
                    </td>
                    <td className={`${td} hidden sm:table-cell`}>{signatoryCell(b.signatory_one_employee)}</td>
                    <td className={`${td} hidden sm:table-cell`}>{signatoryCell(b.signatory_two_employee)}</td>
                    <td className={`${td} hidden text-zinc-500 lg:table-cell`}>
                      {new Date(b.updated_at).toLocaleDateString()}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <Button variant="ghost" onClick={() => setEditing(b)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setDeleting(b);
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
        title={editing === "new" ? "Add branch" : "Edit branch"}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <BranchForm
            branch={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>

      <ConfirmDelete
        open={deleting !== null}
        label={deleting?.branch_name ?? ""}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

// Separate component so its state starts fresh each time the dialog opens.
function BranchForm({
  branch,
  onCancel,
  onSaved,
}: {
  branch: Branch | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(branch?.branch_name ?? "");
  const [one, setOne] = useState(branch?.signatory_one ? String(branch.signatory_one) : "");
  const [two, setTwo] = useState(branch?.signatory_two ? String(branch.signatory_two) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Any employee can sign for any branch (e.g. an acting judge covering two branches).
  // Signatories are set when editing, so a new branch doesn't need the list.
  const employees = useAll<Employee>("employees", {}, branch !== null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const payload: Partial<BranchInput> = { branch_name: name };
    if (branch) {
      payload.signatory_one = one ? Number(one) : null;
      payload.signatory_two = two ? Number(two) : null;
    }
    try {
      if (branch) await api.update("branches", branch.id, payload);
      else await api.create("branches", payload);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors ?? {});
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  };

  const signatorySelect = (value: string, onChange: (v: string) => void, exclude: string, label: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
      disabled={!branch || employees.loading}
      aria-label={label}
    >
      <option value="">{employees.loading ? "Loading…" : "None"}</option>
      {employees.data
        .filter((emp) => String(emp.id) !== exclude)
        .map((emp) => (
          <option key={emp.id} value={emp.id}>
            {fullName(emp)}
            {emp.position ? ` (${emp.position.position_name})` : ""}
            {emp.branch && emp.branch.id !== branch?.id ? ` – ${emp.branch.branch_name}` : ""}
          </option>
        ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Branch name" error={fieldErrors.branch_name?.[0]}>
        <input
          autoFocus
          required
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </Field>

      {branch ? (
        <>
          <Field label="Signatory 1" error={fieldErrors.signatory_one?.[0]}>
            {signatorySelect(one, setOne, two, "Signatory 1")}
          </Field>
          <Field label="Signatory 2" error={fieldErrors.signatory_two?.[0]}>
            {signatorySelect(two, setTwo, one, "Signatory 2")}
          </Field>
          {!employees.loading && employees.data.length === 0 && (
            <p className="text-xs text-zinc-500">
              There are no employees yet. Add employees first to choose signatories.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          After creating the branch, edit it to choose its two signatories from any employee.
        </p>
      )}

      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
