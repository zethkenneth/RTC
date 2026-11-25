"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PayrollFile } from "@/lib/api";
import { Alert, Button } from "./ui";

type Zoom = "fit" | 0.5 | 0.75 | 1;
const ZOOMS: { value: Zoom; label: string }[] = [
  { value: "fit", label: "Fit width" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
  { value: 1, label: "100%" },
];

// The preview library leaves Word's page-number fields blank ("Page  of "), so fill
// them in. Each page is rendered as its own <section>.
function numberPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll("section.docx")];
  pages.forEach((page, i) => {
    const line = [...page.querySelectorAll("footer p")].find((p) => /^Page\s+of$/.test(p.textContent?.trim() ?? ""));
    const [pageRun, ofRun] = line?.querySelectorAll("span") ?? [];
    if (!pageRun || !ofRun) return;
    pageRun.textContent = `Page ${i + 1}`;
    ofRun.textContent = ` of ${pages.length}`;
  });
}

/** Shows the generated Word file page by page, with a button to save it. */
export function PayrollPreview({
  file,
  onClose,
  onDownload,
}: {
  file: PayrollFile;
  onClose: () => void;
  onDownload: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Render the .docx into the page. The library only runs in the browser, so load it on demand.
  useEffect(() => {
    const target = pagesRef.current;
    if (!target) return;
    let cancelled = false;
    import("docx-preview")
      .then(({ renderAsync }) =>
        renderAsync(file.blob, target, undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          experimental: true,
          useBase64URL: true,
        }),
      )
      .then(() => {
        if (cancelled) return;
        numberPages(target);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      target.innerHTML = "";
    };
  }, [file]);

  // "Fit width": scale the page so its full width shows in the window.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (status !== "ready" || !scroller) return;
    const page = pagesRef.current?.querySelector<HTMLElement>("section.docx");
    const pagePx = page ? parseFloat(page.style.width) * (4 / 3) : 0; // width is set in pt
    if (!pagePx) return;
    const measure = () => setFitScale(Math.min(1, (scroller.clientWidth - 48) / (pagePx + 60)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [status]);

  const scale = zoom === "fit" ? fitScale : zoom;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={`Preview of ${file.filename}`}
      className="m-auto h-[calc(100%-2rem)] max-h-none w-[calc(100%-2rem)] max-w-none flex-col overflow-hidden rounded-lg bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 open:flex dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{file.filename}</h2>
          <p className="text-xs text-zinc-500">Preview. Word may break pages slightly differently.</p>
        </div>
        <select
          aria-label="Zoom"
          value={String(zoom)}
          onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : (Number(e.target.value) as Zoom))}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {ZOOMS.map((z) => (
            <option key={z.label} value={String(z.value)}>
              {z.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
          Close
        </Button>
        <Button onClick={onDownload} disabled={status === "loading"}>
          Download .docx
        </Button>
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-auto bg-zinc-300 dark:bg-zinc-800">
        {status === "loading" && <p className="p-6 text-sm text-zinc-600 dark:text-zinc-400">Loading preview…</p>}
        {status === "error" && (
          <div className="p-6">
            <Alert>The preview couldn&apos;t be shown. You can still download the file and open it in Word.</Alert>
          </div>
        )}
        <div ref={pagesRef} style={{ zoom: scale }} />
      </div>
    </dialog>
  );
}
