"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, type Resource } from "@/lib/api";
import { useDebounced, useList } from "@/lib/useList";
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

type Row = { id: number; updated_at: string } & Record<string, unknown>;

// List + create/edit/delete page for tables that only have a single name column.
export function NameResourcePage({
  resource,
  title,
  singular,
  field,
}: {
  resource: Resource;
  title: string;
  singular: string;
  field: "branch_name" | "position_name";
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const { data, meta, loading, error, reload } = useList<Row>(resource, {
    page,
    limit: LIMIT,
    search: debouncedSearch,
  });

  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openForm = (row: Row | "new") => {
    setEditing(row);
    setName(row === "new" ? "" : String(row[field]));
    setFormError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") await api.create(resource, { [field]: name });
      else if (editing) await api.update(resource, editing.id, { [field]: name });
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.remove(resource, deleting.id);
      setDeleting(null);
      // Step back a page if we just removed the last row on this one.
      if (data.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError && err.status === 409
          ? `This ${singular.toLowerCase()} still has employees assigned. Reassign them first.`
          : err instanceof Error
            ? err.message
            : "Delete failed",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={title} action={<Button onClick={() => openForm("new")}>Add {singular.toLowerCase()}</Button>} />

      <input
        type="search"
        placeholder={`Search ${title.toLowerCase()}…`}
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
                <th className={`${th} hidden sm:table-cell`}>Last updated</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading && data.length === 0 ? (
                <TableState colSpan={3}>Loading…</TableState>
              ) : data.length === 0 ? (
                <TableState colSpan={3}>No {title.toLowerCase()} found.</TableState>
              ) : (
                data.map((row) => (
                  <tr key={row.id}>
                    <td className={`${td} font-medium`}>{String(row[field])}</td>
                    <td className={`${td} hidden text-zinc-500 sm:table-cell`}>
                      {new Date(row.updated_at).toLocaleDateString()}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      <Button variant="ghost" onClick={() => openForm(row)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setDeleting(row);
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
        title={editing === "new" ? `Add ${singular.toLowerCase()}` : `Edit ${singular.toLowerCase()}`}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label={`${singular} name`}>
            <input
              autoFocus
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
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
        label={deleting ? String(deleting[field]) : ""}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
