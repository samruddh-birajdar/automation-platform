# ⚡ Advanced Automation Backend Engine

An industry-level, event-driven automation platform built to handle business workflows across different systems. This project replaces scattered automation scripts and low-code workflows with one reliable, self-hosted backend.

![System Architecture](./architecture.png)

## 🚀 Features
- **Webhook Ingestion:** Receives events from external providers (Stripe, Shopify) with signature verification.
- **Duplicate-Safe Execution:** Uses Redis Distributed Locking (`SET NX PX` with Lua release) to ensure exactly-once processing.
- **Asynchronous Processing:** Offloads heavy tasks (HTTP calls, AI generation) to Celery workers via Redis.
- **Real-Time Monitoring:** A React dashboard that polls the event ledger for live execution logs.
- **Real Integrations:** Stripe Checkout for payments and Groq AI for ultra-fast LLM inference.
- **Scheduled Jobs:** Celery Beat for time-based automations.

## 🏗️ System Design & Patterns
This project explicitly utilizes the following design patterns:

| Pattern | Where it's used | Why |
| :--- | :--- | :--- |
| **Observer** | Webhook Ingestion | Decouples the FastAPI route from the Celery task queue. The API saves the event and immediately notifies the observer, returning 200 OK in <50ms. |
| **Factory** | Automation Engine | Dynamically instantiates step types (HTTP, AI) based on the JSON workflow definition. |
| **Strategy** | Retry Logic & AI | Swappable retry policies (Exponential Backoff) and AI providers (Groq). |
| **State** | Event Ledger | Manages the lifecycle of an event (Pending -> Running -> Completed / Failed) in PostgreSQL. |
| **Chain of Responsibility** | Workflow Steps | The Engine processes steps sequentially, passing the payload down the chain. |
| **Singleton** | Database Connection | SQLAlchemy engine connection pool management. |

## 🛡️ Reliability & Security
- **Distributed Locking:** Redis `SET NX PX` with Lua script token release. Verified with `k6` load testing (50 concurrent VUs).
- **Idempotency:** Stripe webhooks are deduplicated using a `unique=True` constraint on `stripe_event_id`.
- **SSRF Protection:** HTTP steps validate URLs and block private/internal IP ranges.
- **Server-Side Pricing:** Checkout amounts are decided on the backend, never trusted from the client.
- **Soft Deletes:** Deleting a workflow sets `is_active=False`, preserving the payment ledger for refunds and audits.

## 🛠️ Technology Stack
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Background Processing:** Celery, Redis, Celery Beat
- **Integrations:** Stripe, Groq AI
- **Frontend:** React (Vite), Tailwind CSS

## 🚀 Quick Start (Docker)
Run the entire stack (Postgres, Redis, FastAPI, Celery, React) with one command:

```bash
cp Automation-Backend/.env.docker.example Automation-Backend/.env.docker
# Fill in your API keys in .env.docker

docker compose up --build
```

Then open **http://localhost** in your browser.

### ⚠️ Troubleshooting Docker
If you get a `password authentication failed` error on the first run, it means Docker has a stale Postgres volume. Fix it with:

```bash
docker compose down -v
sudo systemctl stop docker
sudo rm -rf /var/lib/docker/volumes/automation-platform_postgres_data
sudo systemctl start docker
docker compose up --build
```

## 🧪 Manual Setup (Without Docker)

### 1. Database Setup
```sql
CREATE DATABASE automation_db;
CREATE USER automation_user WITH PASSWORD 'automation_password';
GRANT ALL PRIVILEGES ON DATABASE automation_db TO automation_user;
```

### 2. Backend
```bash
cd Automation-Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Create `.env`:
```env
DATABASE_URL=postgresql+psycopg2://automation_user:automation_password@localhost:5432/automation_db
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret
```

Start the server:
```bash
uvicorn main:app --reload
```

### 3. Celery Worker
```bash
cd Automation-Backend
source venv/bin/activate
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

### 4. Celery Beat (Scheduler)
```bash
cd Automation-Backend
source venv/bin/activate
celery -A app.core.celery_app.celery_app beat --loglevel=info
```

### 5. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📡 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workflows/` | Create a new workflow |
| `GET` | `/api/workflows/` | List all active workflows |
| `DELETE` | `/api/workflows/{id}` | Soft-delete a workflow |
| `POST` | `/webhook/{workflow_id}` | Trigger a workflow (manual/demo) |
| `POST` | `/webhook/stripe` | Stripe webhook receiver |
| `GET` | `/api/events/` | View the latest 50 events |

## 📈 Future Roadmap
- [ ] Add Clerk Authentication for multi-tenant workflow management.
- [ ] Implement a visual drag-and-drop builder in React.
- [ ] Add webhook signature verification for GitHub and Shopify.

### 🛑 Final Step: Push to GitHub
```bash
cd ~/Documents/Python/Automations/Automation-Platform
git add .
git commit -m "docs: add comprehensive README with architecture and design patterns"
git push

## 📸 Screenshots
![Dashboard](screenshots/CreatingWorkflow.png)
![Stripe](screenshots/CardPayment.png)
![Live Logs](screenshots/AutomatedWorkflow.png)
![Render](screenshots/Render_Testing.png)
