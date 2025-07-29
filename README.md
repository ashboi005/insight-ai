# InsightBoard AI Dashboard

A smart dashboard for uploading meeting transcripts and geenrating AI-generated action items based on them.
Tasks get assigned Priority and Team.

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (SQLAlchemy ORM, Alembic migrations)
- **Authentication:** JWT (access & refresh tokens)
- **File Storage:** Supabase Storage (for transcript files)
- **AI/LLM:** Google Gemini API (for task extraction, summary, sentiment)
- **Cloud:** AWS Lambda (via AWS SAM), Mangum (ASGI adapter)
- **Other:** dotenv, logging

### Frontend
- **Framework:** Next.js (React, TypeScript, App Router)
- **UI:** Tailwind CSS, Shadcn/ui, Recharts, Lucide Icons, Radix UI
- **State Management:** React Context API
- **Notifications/Toast:** Sonner
- **API:** REST (fetch, custom API clients)

---

## LLM API Choice

- **Google Gemini API** is used for extracting tasks, generating summaries, and sentiment analysis from meeting transcripts.
- **Note:** The Gemini API key is required in the backend `.env` as `GEMINI_API_KEY`.

---

## Hosted App

- **Frontend:** [https://insight-board-ai.vercel.app/](https://insightboard-ai.vercel.app/) (replace with your actual link)
- **Backend:** [https://dgyy7el5y9.execute-api.ap-south-1.amazonaws.com/Prod](https://dgyy7el5y9.execute-api.ap-south-1.amazonaws.com/Prod) (AWS Lambda, FastAPI)

---

## Level Completed - 3 (except Unit and Integration Testing)

## Local Setup Instructions

### Prerequisites

- Node.js (v18+)
- Python (3.11+)
- PostgreSQL
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- Supabase account (for file storage)

### 1. Clone the Repository

```sh
git clone https://github.com/yourusername/insight-ai.git
cd insight-ai
```

### 2. Backend Setup

```sh
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

#### Configure `.env`

Create a `.env` file in `backend/`:

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/insightai
JWT_SECRET_KEY=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=insight-ai
GEMINI_API_KEY=your_gemini_api_key
AWS_REGION=ap-south-1
```

#### Run Database Migrations

```sh
alembic upgrade head
```

#### Start Backend Locally

```sh
uvicorn main:app --reload
```

- API docs: [http://localhost:8000/apidocs](http://localhost:8000/apidocs)

### 3. Frontend Setup

```sh
cd ../frontend
npm install
```

#### Configure `.env.local`

Create a `.env.local` file in `frontend/`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

#### Start Frontend

```sh
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)

---

## Hosted Deployment

### Backend

- Deployed to AWS Lambda using AWS SAM.
- CORS is enabled for all origins (update for production).
- Environment variables are set in AWS Lambda console.

### Frontend

- Deployed to Vercel (or your preferred platform).
- Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL.

---

## Infrastructure Setup

### Backend

- **AWS Lambda:** Deploy with AWS SAM (`sam build && sam deploy`)
- **Supabase:** Used for file storage (transcript files)
- **PostgreSQL:** Managed DB (e.g., AWS RDS, Supabase, or local)
- **Environment Variables:** Managed via `.env` locally and Lambda environment in production

### Frontend

- **Vercel:** For Next.js hosting
- **Environment Variables:** Set in Vercel dashboard

---

## Troubleshooting

### Gemini API Key Expiry

- The Gemini API key used for the hosted backend may expire or hit quota.
- **If transcript processing fails with an AI error:**
  - Clone and run the backend locally.
  - Set your own valid `GEMINI_API_KEY` in `.env`.
  - Restart the backend and try again.

---

## Useful Links

- [Google Gemini API](https://aistudio.google.com/app/apikey)
- [Supabase](https://supabase.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)

---

## Contact

For issues or questions, please open an issue on the repository or