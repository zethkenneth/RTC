# RTC Frontend

Next.js + TypeScript dashboard for managing employees, branches and positions.
It talks to the Express API in `../backend`.

## Run

1. Start the backend first (`cd ../backend && npm run dev`, runs on port 4000).
2. Copy `.env.example` to `.env.local` and set `API_URL` if your backend is not at `http://localhost:4000`. Browser calls to `/api/*` are forwarded there, so login cookies work on one domain.
3. `npm install`
4. `npm run dev` and open http://localhost:3000

## Pages

Everything except the login pages requires being logged in; signed-out visitors are sent to `/login`.

- `/login` Email and password login
- `/forgot-password` Request a password reset email
- `/reset-password` Set a new password (opened from the email link)
- `/` Dashboard with totals for each table
- `/employees` List, search, filter by branch/position, add, edit, delete
- `/branches` List, search, add, edit, delete
- `/positions` List, search, add, edit, delete

## Structure

- `src/lib/api.ts` fetch wrapper for the backend API, including auth calls
- `src/proxy.ts` redirects signed-out visitors to `/login`
- `src/components/auth/` login, forgot password and reset password forms
- `src/lib/useList.ts` hook for paginated lists, plus a debounce hook for search
- `src/components/ui.tsx` shared buttons, inputs, modal, table helpers
- `src/components/NameResourcePage.tsx` shared page for branches and positions
- `src/components/EmployeesPage.tsx` employees page
