# ⚡ Advanced Automation Backend Engine

An industry-level, event-driven automation platform built to handle business workflows across different systems. This project replaces scattered automation scripts with one reliable, self-hosted backend.

## 🏗️ System Architecture & Design Patterns

This project is built with system design principles in mind. It explicitly utilizes the following design patterns:

1. **Observer Pattern:** Used for webhook ingestion to decouple the API from processing.
2. **Factory Pattern:** Dynamically instantiates different workflow step types (HTTP, AI).
3. **Strategy Pattern:** Configurable retry policies (e.g., Exponential Backoff).
4. **State Pattern:** Manages execution states (Pending, Running, Failed, Completed) in the DB.
5. **Chain of Responsibility:** The Engine iterates through a sequence of steps.
6. **Singleton Pattern:** Database connection pool management.
7. **Builder Pattern:** Complex workflow definition construction.

## 🛠️ Technology Stack

- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Background Processing:** Celery & Redis
- **Frontend:** React (Vite), Tailwind CSS

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js & npm
- PostgreSQL
- Redis

### 1. Database Setup
```sql
CREATE DATABASE automation_db;
CREATE USER automation_user WITH PASSWORD 'automation_password';
GRANT ALL PRIVILEGES ON DATABASE automation_db TO automation_user;

### 2.Backend Setup

cd Automation-Backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic-settings python-dotenv celery redis httpx

Create a .env file:


DATABASE_URL=postgresql+psycopg2://automation_user:automation_password@localhost:5432/automation_db

Start the server:

uvicorn main:app --reload

### 3. Start the Celery Worker
cd Automation-Backend
source venv/bin/activate
celery -A app.core.celery_app.celery_app worker --loglevel=info

### 4. Frontend Setup

cd frontend
npm install
npm run dev

```