# IndexFly — Custom Full-Text Search Engine & Web Crawler

BM25 ranking · Boolean queries (AND / OR / AND NOT) · Inverted index  
**Stack:** Go (backend API) + React + TypeScript + Tailwind CSS (frontend)

---

## Run

### 1. Backend (Go)
```bash
cd backend
go run .
# API → http://localhost:8080
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
# UI → http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=...` | BM25 ranked or boolean search |
| GET | `/api/stats` | Index stats (docs, terms, avg_dl) |
| GET | `/api/reindex` | Rebuild index from sample_docs/ |

## Query Syntax

| Query | Mode |
|-------|------|
| `python data` | BM25 ranked |
| `machine AND learning` | Boolean AND |
| `database OR python` | Boolean OR |
| `database AND NOT SQL` | Boolean AND NOT |

## Add Your Own Docs
Drop any `.txt` files into `backend/sample_docs/` then hit **Reindex** in the UI.
