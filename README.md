# Digital Prescription

A clinic app for doctors to register patients, record consultations and print clean digital
prescriptions, with every patient's full visit and medicine history one click away.

Built on the team's **application-template**: FastAPI + PostgreSQL backend, React + TypeScript
frontend, secure cookie-based authentication, and the same Claude Code skills and conventions.
The UI started as a frontend-only prototype with dummy data; this project gives it a real
backend, real sign-in and a database.

## Features

| Screen | What it does | API |
|---|---|---|
| Sign in | Email + password (no demo "sign in as" shortcuts) | `POST /auth/login` |
| Dashboard | Patients, today's visits, prescriptions this month, active doctors, 7-day trend, top diagnoses, follow-ups due in 14 days, recent activity | `GET /dashboard`, `GET /activities` |
| Patients | Search by name or phone, filter by doctor, paging, register a patient | `GET/POST /patients` |
| Patient detail | Overview, visit-history timeline, new prescription with preview | `GET /patients/{id}`, `GET /visits?patient_id=`, `POST /visits` |
| Print | Letterhead prescription pad, opens the print dialog | `GET /visits/{id}` |
| Visit log | Every visit, filter by patient, doctor, date range (clinic timezone) | `GET /visits` |
| Doctors | Care-team directory with workload; admins add doctors and disable/enable accounts | `GET /doctors`, `POST/PATCH /users` |
| Account menu | Change password, sign out | `POST /auth/change-password`, `POST /auth/logout` |

Interactive API docs: http://localhost:8000/docs when the backend runs locally.

### Who can do what

| Action | Doctor | Admin |
|---|---|---|
| View dashboard, patients, visit log, doctors | ✓ | ✓ |
| Register a patient | ✓ | ✓ |
| Edit a patient (`PATCH /patients/{id}`) | only their own assigned patients | any |
| Write a prescription | ✓ for any patient, always signed as themselves | ✓ |
| Edit or delete a prescription | ✗ (medical record) | ✗ |
| Add / disable doctors, change roles | ✗ | ✓ |

## Data model

```
users (doctors)  1 ── * patients (assigned_doctor_id)
users            1 ── * visits (doctor_id = prescriber)
patients         1 ── * visits ── * prescription_items (medicines, in order)
activities       audit feed: prescription | patient_added | doctor_added | login
```

## Getting started (Windows, native PostgreSQL)

**Prerequisites:** Python 3.12+, [uv](https://docs.astral.sh/uv/), Node.js 24 LTS, PostgreSQL 15+.

### 1. Database (once)

In pgAdmin's Query Tool, on your PostgreSQL server:

```sql
CREATE USER app WITH PASSWORD 'app';
CREATE DATABASE app OWNER app;
CREATE DATABASE app_test OWNER app;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env:
#  - JWT_SECRET_KEY: python -c "import secrets; print(secrets.token_urlsafe(64))"
#  - DATABASE_URL / TEST_DATABASE_URL: change the port if your PostgreSQL isn't on 5432
uv sync
uv run alembic upgrade head
uv run python -m app.cli seed-demo          # sample clinic: 5 doctors, 12 patients, 27 visits
uv run uvicorn app.main:app --reload        # http://localhost:8000/docs
```

`seed-demo` asks for one password that every demo doctor will use. Sign in as
`ananya.rao@clinic.in` (admin) or `vikram.shah@clinic.in`, `priya.menon@clinic.in`,
`arjun.nair@clinic.in`, `kavya.iyer@clinic.in`. It only runs on an empty database and never in
production.

For a real clinic, skip `seed-demo` and create the first admin instead:

```bash
uv run python -m app.cli create-admin --email dr.admin@clinic.in --name "Dr. Admin" --specialization "General Medicine"
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Vite proxies `/api` to the backend, so the browser sees a single origin.

### 4. Tests

```bash
cd backend && uv run pytest --cov    # needs TEST_DATABASE_URL; the app_test database is wiped
cd frontend && npm test
```

## Configuration

| Setting | Where | Notes |
|---|---|---|
| `CLINIC_TIMEZONE` | `backend/.env` | Default `Asia/Kolkata`. "Today", "this month", follow-ups and visit-log dates use it |
| Letterhead (clinic name, address, phone, email) | `frontend/src/config/clinic.ts` | Printed on every prescription |
| Medicine suggestions | `frontend/src/features/visits/medicines.ts` | Autocomplete list in the prescription form |
| Everything else | `backend/.env.example` | Same as the template |

Fonts (Inter, Lora) are bundled with the app, not loaded from Google, so they work on offline
LAN installs and under the strict Content-Security-Policy.

## Everyday commands

| Task | Command |
|---|---|
| New migration | `cd backend && uv run alembic revision --autogenerate -m "add x"` (then review it) |
| Apply migrations | `uv run alembic upgrade head` |
| Regenerate frontend API types | `cd frontend && npm run gen:api` |
| Lint + types (backend) | `uv run ruff check . && uv run mypy app tests` |
| Lint + types (frontend) | `npm run lint && npm run typecheck` |

## Working with Claude Code

`CLAUDE.md` loads automatically and describes the clinic's rules. The template's skills in
`.claude/skills/` apply unchanged (`ship-feature`, `write-tests`, `db-migration`,
`review-and-fix`, `security-audit`, `offline-deployment`, ...). Example:

- "Use ship-feature to add lab-test orders to a visit."

## Deployment

Same as the template: see `deploy/`, the [Linux deployment guide](deploy/linux/README.md) and
the `offline-deployment` skill. Cloud (`DEPLOY_MODE=cloud`) or LAN / offline (`DEPLOY_MODE=lan`).

## Security model (summary)

| Concern | Implementation |
|---|---|
| Passwords | argon2id; 12–128 chars; lockout after repeated failures |
| Sessions | JWT access token (15 min) + rotating refresh token, httpOnly cookies, reuse detection |
| CSRF | Double-submit token on every state-changing API call |
| Authorization | Checked in services (see "Who can do what"); the prescriber can't be spoofed |
| Medical records | Visits are append-only; every prescription, registration and sign-in is logged |
| Headers | Strict CSP, `nosniff`, `X-Frame-Options: DENY`, HSTS (cloud) |

## License

[MIT](LICENSE) (inherited from the template; confirm the right license for client work).
