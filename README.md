# WriteSpace

WriteSpace is a plain-text publishing workspace with public discovery, writer post management, and administrator account governance.

## Setup

### Backend

```bash
cd backend
python -m venv --copies .venv
.venv/bin/python -m pip install -r requirements.txt
PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

On Windows, activate `.venv\Scripts\activate` and use `python` in the same commands. Copy `backend/.env.example` to `backend/.env` only when custom local settings are needed; never commit it.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` only when a separate API origin is needed. The frontend sends bearer tokens issued by the backend.

## Demo warning

A fresh database seeds `admin` / `admin` as a demonstration-only default administrator. Replace or disable that credential before exposing any deployment.

## Test and build

```bash
cd backend
PYTHONPATH=. .venv/bin/python -m pytest tests/test_admin.py tests/test_integration.py -q

cd ../frontend
npm test
npm run build
```

Backend tests use temporary **file-backed** SQLite databases. The browser journey can be run with the project Playwright configuration after starting both services.

## Environment

Backend: `DATABASE_URL`, `CORS_ORIGINS`, `JWT_SECRET`, and `JWT_EXPIRES_MINUTES`. Frontend: `VITE_API_URL`. Complete dummy-value contracts are committed in each tier's `.env.example` file.

## API summary

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/public/posts`; authenticated `GET/POST/PUT/DELETE /api/posts`
- Admin-only `GET /api/admin/stats`, `GET/POST /api/users`, and `DELETE /api/users/{id}`
- `GET /api/health`

Administrative responses expose only safe profiles; passwords, hashes, active flags, and default-admin flags are never returned. Removing an eligible account retains its posts and immutable attribution snapshots.

## Docker Compose

```bash
docker compose up --build
```

Compose exposes the backend on port 8000 and the frontend on port 5173, while persisting SQLite data in the `writespace-data` volume.
