// Builds the "Pasig City Payroll" Word document, copying the layout of
// "List of RTC PJs, Officials and Personnel.docx": one section per branch,
// column headings in the page header, branch signatories in the section footer.
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
  type ISectionOptions,
} from "docx";
import { money } from "./period.js";

export interface PayrollPerson {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  position_name: string | null;
}

/** An employee on the payroll, with what they're paid for the quarter. */
export interface PayrollPayee extends PayrollPerson {
  months: number;
  period: string; // months covered, e.g. "August-September 2026"
  amount: number; // pesos
}

export interface PayrollBranch {
  branch_name: string;
  employees: PayrollPayee[]; // only employees paid this quarter, in display order
  signatory_one: PayrollPerson | null;
  signatory_two: PayrollPerson | null;
}

export interface Signer {
  name: string;
  title: string;
  line?: string; // optional extra line, e.g. "RTC Branch 154 – Pasig City"
}

export interface PayrollOptions {
  periodCovered: string; // "July to September 2026" (page header)
  treasurer: string; // "MARITA A. CALAJE"
  checkedBy: Signer;
  notedBy: Signer;
  rowsPerPage: number;
}

// ---- Measurements copied from the source document (twips: 1440 = 1 inch) ---

const FONT = "Times New Roman";
const PAGE = { width: 12242, height: 18722 }; // 8.5" x 13", used in landscape
const MARGIN = { top: 432, right: 720, bottom: 432, left: 720, header: 706, footer: 706 };
// NO. | NO. per branch | NAME | POSITION | DEPARTMENT | PERIOD | TOTAL | RECEIVED | NO. | SIGNATURE
const COLS = [625, 630, 2970, 2250, 1710, 3780, 1080, 1170, 630, 2340];
const FOOTER_COLS = [4950, 1080, 3330, 810, 1980, 1080, 4042];
const ROW_HEIGHT = 288;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// docx sizes are in half-points.
const pt = (n: number) => n * 2;

const run = (text: string, size: number, opts: { bold?: boolean; underline?: boolean } = {}) =>
  new TextRun({
    text,
    font: FONT,
    size: pt(size),
    bold: opts.bold,
    underline: opts.underline ? {} : undefined,
  });

const para = (
  children: TextRun[],
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  extra: { spacingBefore?: number } = {},
) =>
  new Paragraph({
    children,
    alignment,
    spacing: { before: extra.spacingBefore ?? 0, after: 0, line: 240 },
  });

const single = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const gridBorders = { top: single, bottom: single, left: single, right: single, insideHorizontal: single, insideVertical: single };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

function cell(
  width: number,
  paragraphs: Paragraph[],
  opts: { vMerge?: "restart" | "continue"; vAlign?: "center" | "bottom" | "top" } = {},
) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: paragraphs.length ? paragraphs : [para([])],
    verticalAlign:
      opts.vAlign === "bottom" ? VerticalAlign.BOTTOM : opts.vAlign === "top" ? VerticalAlign.TOP : VerticalAlign.CENTER,
    verticalMerge:
      opts.vMerge === "restart"
        ? VerticalMergeType.RESTART
        : opts.vMerge === "continue"
          ? VerticalMergeType.CONTINUE
          : undefined,
  });
}

// ---- Name formatting -------------------------------------------------------

const initial = (middle: string | null) => (middle?.trim() ? `${middle.trim()[0].toUpperCase()}.` : "");

/** "Aban, Princess Ivy M." or "Rivera, Carlos, Jr. P." — how payees are listed. */
export const listName = (p: PayrollPerson) => {
  const mi = initial(p.middle_name);
  return `${p.last_name}, ${p.first_name}${p.suffix ? `, ${p.suffix}` : ""}${mi ? ` ${mi}` : ""}`;
};

// Signers keep a full middle name when one is stored ("MARY KWEN CAÑETE ELEFANTE").
// Initials are printed as stored ("P.", "D.V."), adding a missing period ("P" -> "P.").
const signerMiddle = (middle: string | null) => {
  const m = middle?.trim() ?? "";
  return /^[A-Za-z]{1,2}$/.test(m) ? `${m}.` : m;
};

/** "CHRISTIAN HARVEY P. DUCAY", "JESUS ANGELITO Y. HUERTAS JR." — how signatories are printed. */
export const signerName = (p: PayrollPerson) =>
  [p.first_name, signerMiddle(p.middle_name), p.last_name, p.suffix].filter(Boolean).join(" ").toUpperCase();

// ---- Page header (same on every page) ---------------------------------------

function buildHeader(o: PayrollOptions) {
  const headings = [
    [para([run("Total No. of RTC Employees", 5)], AlignmentType.CENTER)],
    [para([run("Total No. of RTC", 5)], AlignmentType.CENTER), para([run("Employees per branch", 5)], AlignmentType.CENTER)],
    [para([run("NAME", 10, { bold: true })], AlignmentType.CENTER)],
    [para([run("POSITION", 10, { bold: true })], AlignmentType.CENTER)],
    [para([run("DEPARTMENT", 10, { bold: true })], AlignmentType.CENTER)],
    [
      para([run("PERIOD COVERED", 10, { bold: true })], AlignmentType.CENTER),
      para([run(`(${o.periodCovered})`, 10)], AlignmentType.CENTER),
    ],
    [para([run("TOTAL AMOUNT", 9, { bold: true })], AlignmentType.CENTER)],
    [para([run("TOTAL AMOUNT RECEIVED", 9, { bold: true })], AlignmentType.CENTER)],
    [para([run("NO.", 6, { bold: true })], AlignmentType.CENTER)],
    [para([run("Signature of Payee", 10, { bold: true })], AlignmentType.CENTER)],
  ];

  return new Header({
    children: [
      para([run("Pasig City Payroll", 15, { bold: true })], AlignmentType.CENTER),
      para(
        [
          run("We hereby acknowledged to have received from ", 8),
          run(o.treasurer, 8, { bold: true, underline: true }),
          run(", City Treasurer of Pasig City, the sums herein specified opposite our respective names, ", 8),
        ],
        AlignmentType.CENTER,
      ),
      para(
        [
          run(
            "the same being full compensation for the service rendered during the period stated below, to the correctness of which we hereby severally certify.",
            8,
          ),
        ],
        AlignmentType.CENTER,
      ),
      para([run("MONTHLY ALLOWANCE TO NATIONAL GOVERNMENT EMPLOYEE ASSIGNED IN THE CITY OF PASIG", 8)]),
      new Table({
        width: { size: sum(COLS), type: WidthType.DXA },
        columnWidths: COLS,
        layout: TableLayoutType.FIXED,
        borders: gridBorders,
        rows: [new TableRow({ children: headings.map((p, i) => cell(COLS[i], p)) })],
      }),
    ],
  });
}

// ---- Branch footer -----------------------------------------------------------

function signerBlock(name: string, title: string, line?: string) {
  const ps = [
    para([run(name, 7, { bold: true })], AlignmentType.CENTER, { spacingBefore: 280 }),
    para([run(title, 7)], AlignmentType.CENTER),
  ];
  if (line) ps.push(para([run(line, 7)], AlignmentType.CENTER));
  return ps;
}

// Unassigned signatory: leave a line to sign on.
const BLANK_NAME = "______________________________";

function buildFooter(branch: PayrollBranch, o: PayrollOptions) {
  const sig = (p: PayrollPerson | null) =>
    p ? signerBlock(signerName(p), p.position_name ?? "") : signerBlock(BLANK_NAME, "");
  const text = (s: string) => [para([run(s, 7)], AlignmentType.JUSTIFIED)];
  const gap = (i: number) => cell(FOOTER_COLS[i], []);

  const top = new TableRow({
    children: [
      cell(FOOTER_COLS[0], text(
        "I HEREBY CERTIFY on my official oath that the above PAYROLL is correct, and that services above stated have been duly rendered. Payment for such services is also hereby approved from the appropriations indicated.",
      ), { vAlign: "top" }),
      gap(1),
      cell(FOOTER_COLS[2], text(
        "This is to certify that there is no payroll padding/resigned/deceased/abroad casual employees in this payroll",
      ), { vAlign: "top" }),
      gap(3),
      cell(FOOTER_COLS[4], text("    Checked/Verified by:"), { vAlign: "top" }),
      gap(5),
      cell(FOOTER_COLS[6], text("Noted by:"), { vAlign: "top" }),
    ],
  });

  const bottom = new TableRow({
    children: [
      cell(FOOTER_COLS[0], sig(branch.signatory_one), { vAlign: "top" }),
      gap(1),
      cell(FOOTER_COLS[2], sig(branch.signatory_two), { vAlign: "top" }),
      gap(3),
      cell(FOOTER_COLS[4], signerBlock(o.checkedBy.name, o.checkedBy.title, o.checkedBy.line), { vAlign: "top" }),
      gap(5),
      cell(FOOTER_COLS[6], signerBlock(o.notedBy.name, o.notedBy.title, o.notedBy.line), { vAlign: "top" }),
    ],
  });

  return new Footer({
    children: [
      new Table({
        width: { size: sum(FOOTER_COLS), type: WidthType.DXA },
        columnWidths: FOOTER_COLS,
        layout: TableLayoutType.FIXED,
        borders: noBorders,
        rows: [top, bottom],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ font: FONT, size: pt(5), bold: true, children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES] }),
        ],
      }),
    ],
  });
}

// ---- Branch body -------------------------------------------------------------

interface NumberedRow {
  overall: number; // running number across the whole document
  inBranch: number; // number within the branch
  person: PayrollPayee;
}

function bodyRow(cells: TableCell[]) {
  return new TableRow({ height: { value: ROW_HEIGHT, rule: HeightRule.ATLEAST }, children: cells });
}

/** One page of a branch. The document's last page also gets the GRAND TOTAL row. */
function branchTable(branchName: string, rows: NumberedRow[], grandTotal?: number) {
  type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
  const text = (s: string, align: Align = AlignmentType.LEFT, bold = false) => [para([run(s, 10, { bold })], align)];

  const dataRows = rows.map((r, i) =>
    bodyRow([
      cell(COLS[0], text(String(r.overall), AlignmentType.CENTER)),
      cell(COLS[1], text(String(r.inBranch), AlignmentType.CENTER)),
      cell(COLS[2], text(listName(r.person))),
      cell(COLS[3], text(r.person.position_name ?? "")),
      // The department name is written once and merged down the page's rows.
      i === 0
        ? cell(COLS[4], text(branchName, AlignmentType.CENTER), { vMerge: "restart" })
        : cell(COLS[4], [], { vMerge: "continue" }),
      cell(COLS[5], text(r.person.period)),
      cell(COLS[6], text(money(r.person.amount), AlignmentType.RIGHT)),
      cell(COLS[7], []),
      cell(COLS[8], text(String(r.overall), AlignmentType.CENTER)),
      cell(COLS[9], []),
    ]),
  );

  const empty = () => COLS.map((w) => cell(w, []));
  // Label under PERIOD COVERED, amount under TOTAL AMOUNT.
  const totalRow = (label: string, amount: number) =>
    bodyRow(
      COLS.map((w, i) =>
        i === 5
          ? cell(w, text(label, AlignmentType.RIGHT, true))
          : i === 6
            ? cell(w, text(money(amount), AlignmentType.RIGHT, true))
            : cell(w, []),
      ),
    );
  const pageTotal = rows.reduce((t, r) => t + r.person.amount, 0);

  return new Table({
    width: { size: sum(COLS), type: WidthType.DXA },
    columnWidths: COLS,
    layout: TableLayoutType.FIXED,
    borders: gridBorders,
    rows: [
      ...dataRows,
      bodyRow(empty()),
      totalRow("PAGE TOTAL", pageTotal),
      ...(grandTotal !== undefined ? [totalRow("GRAND TOTAL", grandTotal)] : []),
    ],
  });
}

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

// ---- Document ----------------------------------------------------------------

export async function buildPayrollDocx(branches: PayrollBranch[], o: PayrollOptions): Promise<Buffer> {
  const header = buildHeader(o);
  const paid = branches.filter((b) => b.employees.length > 0);
  const grandTotal = paid.reduce((t, b) => t + b.employees.reduce((u, e) => u + e.amount, 0), 0);
  let overall = 0;

  const sections: ISectionOptions[] = paid.map((b, bi) => {
      const numbered: NumberedRow[] = b.employees.map((person, i) => ({
        overall: ++overall,
        inBranch: i + 1,
        person,
      }));

      // One table per page, each ending in its own PAGE TOTAL row.
      const pages = chunk(numbered, o.rowsPerPage);
      const isLastBranch = bi === paid.length - 1;
      const children = pages.flatMap((rows, i) => [
        ...(i > 0 ? [new Paragraph({ pageBreakBefore: true, spacing: { after: 0 }, children: [run("", 1)] })] : []),
        branchTable(b.branch_name, rows, isLastBranch && i === pages.length - 1 ? grandTotal : undefined),
      ]);
      // Word expects a paragraph after a table at the end of a section.
      children.push(new Paragraph({ spacing: { after: 0 }, children: [run("", 1)] }));

      return {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.LANDSCAPE },
            margin: MARGIN,
          },
        },
        headers: { default: header },
        footers: { default: buildFooter(b, o) },
        children,
      };
    });

  if (sections.length === 0) {
    throw new Error("NO_PAYROLL_EMPLOYEES");
  }

  const doc = new Document({
    creator: "RTC Directory",
    title: `Pasig City Payroll (${o.periodCovered})`,
    styles: { default: { document: { run: { font: FONT, size: pt(10) } } } },
    sections,
  });
  return Packer.toBuffer(doc);
}
