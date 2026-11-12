# RTC Backend

Express + TypeScript REST API for employees, branches and positions, backed by Supabase.

## Setup

1. In the Supabase dashboard, open the SQL editor and run `db/schema.sql` (new database).
   If you already ran an earlier `schema.sql`, run the files in `db/migrations/` you haven't run yet, in order
   (`002_signatories_and_payroll.sql`, `003_employee_service_dates.sql`, `004_suffix_and_open_signatories.sql`).
   To load the staff from "List of RTC PJs, Officials and Personnel.docx", then run
   `db/seeds/001_rtc_employees.sql` and `db/seeds/002_rtc_signatories.sql`, in that order.
2. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API). Keep the service role key on the server only.
3. `npm install`
4. `npm run dev` (watch mode) or `npm run build && npm start`.

The API runs on `http://localhost:4000` by default.

## Endpoints

Each resource (`branches`, `positions`, `employees`) under `/api` has:

| Method | Path              | Description                         | Success |
| ------ | ----------------- | ----------------------------------- | ------- |
| GET    | `/api/<resource>` | List with pagination and search     | 200     |
| GET    | `/api/<resource>/:id` | Get one                         | 200     |
| POST   | `/api/<resource>` | Create                              | 201     |
| PATCH  | `/api/<resource>/:id` | Partial update                  | 200     |
| DELETE | `/api/<resource>/:id` | Delete                          | 204     |

List query params: `page` (default 1), `limit` (default 20, max 100), `search`.
Employees also accept `branch_id`, `position_id` and `payroll_flag` (`true`/`false`) filters, e.g.
`GET /api/employees?branch_id=2&payroll_flag=true&search=santos`.

List responses look like `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }`.
Single-record responses look like `{ "data": { ... } }`.
Employee records include the embedded `branch` and `position` objects.
Branch records include `signatory_one_employee` and `signatory_two_employee` (id and name, or `null`).

### Request bodies

```jsonc
// POST /api/branches
{ "branch_name": "Cebu Main" }

// PATCH /api/branches/:id  (signatories are employee ids; null clears one)
{ "signatory_one": 4, "signatory_two": 7 }

// POST /api/positions
{ "position_name": "Branch Manager" }

// POST /api/employees
{
  "email": "juan@example.com",
  "first_name": "Juan",
  "middle_name": "Reyes",   // optional
  "last_name": "Dela Cruz",
  "suffix": "Jr.",          // optional
  "position_id": 1,
  "branch_id": 1,
  "payroll_flag": true,     // optional, defaults to false
  "date_hired": "2026-08-10",   // optional
  "retired_flag": false,        // optional, defaults to false
  "date_retired": null          // required when retired_flag is true
}
```

### Branch signatories

- Each branch has two optional signatories, `signatory_one` and `signatory_two`.
- A signatory can be any employee, including one from another branch (e.g. an acting judge
  who signs for two branches). The two must be different people (400 if not).
- If a signatory is deleted, their slot is cleared automatically.

### Errors

Errors return `{ "error": "message", "details": ... }`:

- `400` invalid input, or a `branch_id` / `position_id` that does not exist
- `404` record or route not found
- `409` duplicate value (email, branch name, position name), or deleting a branch/position that employees still use
- `500` unexpected database error (details are logged on the server)

## Authentication

Login uses Supabase Auth. The session is kept in two httpOnly cookies (`rtc_access`, `rtc_refresh`);
an expired access token is renewed automatically from the refresh token.
All `/api/branches`, `/api/positions` and `/api/employees` routes require a logged-in user.

| Method | Path                         | Body                          | Notes |
| ------ | ---------------------------- | ----------------------------- | ----- |
| POST   | `/api/auth/login`            | `{ email, password }`         | Sets session cookies. 401 on wrong email or password |
| POST   | `/api/auth/logout`           | none                          | Clears cookies and revokes the session |
| GET    | `/api/auth/me`               | none                          | Current user, or 401 |
| POST   | `/api/auth/forgot-password`  | `{ email }`                   | Sends a reset email. Always 200, so it can't reveal which emails exist |
| POST   | `/api/auth/reset-password`   | `{ access_token, password }`  | `access_token` comes from the reset email link. Signs out all sessions |

### Supabase setup for auth

1. Authentication → URL Configuration: set **Site URL** to your frontend (e.g. `http://localhost:3000`)
   and add `http://localhost:3000/reset-password` to **Redirect URLs**.
2. Create login accounts with `npm run create-user -- someone@example.com "a-strong-password"`
   (or in the dashboard under Authentication → Users).
3. Supabase's built-in email sender only allows a few emails per hour. For real use, set up custom SMTP
   under Authentication → Emails.

## Payroll report (.docx)

`POST /api/reports/payroll` returns the Pasig City Payroll as a Word file, in the layout of
`List of RTC PJs, Officials and Personnel.docx` (13" x 8.5" landscape, Times New Roman).

```jsonc
{
  "year": 2026,
  "quarter": 3,                                  // 1–4; 3 = July to September
  "treasurer": "MARITA A. CALAJE",
  "checked_by_name": "Atty. ROSALIE C. AROSA",
  "checked_by_title": "Clerk of Court VII",
  "noted_by_name": "ACHILLES ARISTOTLE APOLINARIO C. BULAUITAN",
  "noted_by_title": "Executive Judge",
  "noted_by_line": "RTC Branch 154 – Pasig City", // optional
  "branch_ids": [1, 2],                          // optional, default all branches
  "rows_per_page": 22                            // optional, 5–23
}
```

- One section per branch (branches in natural name order). Branches with no payroll employees are skipped.
- Only employees with `payroll_flag = true` are listed, sorted by last name, as "Last, First M.".
- Amount = months covered × ₱1,000. Months covered are the quarter's months from `date_hired` to
  `date_retired` (both months included; the retirement date only counts when `retired_flag` is true).
  E.g. Q3 2026: hired August → August-September 2026, ₱2,000; retired July → July 2026, ₱1,000.
  Employees with no months in the quarter are left out. The PERIOD COVERED cell shows each employee's months.
- Numbering: a running number across the whole document, plus a number within each branch.
- Each page's table ends with an empty row and a PAGE TOTAL row; long branches continue on the next page.
  The document's last page also has a GRAND TOTAL row (all branches in the report).
- Footer: the branch's `signatory_one` and `signatory_two` (name in caps + position), then the
  Checked/Verified by and Noted by signers from the request, and "Page X of Y".
  A missing signatory prints a blank signing line.

Code: `src/reports/payrollDocx.ts` (layout) and `src/reports/payrollData.ts` (data).
