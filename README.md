# Price Pilot

Price Pilot is a full-stack price comparison application with a React frontend and an Express/MongoDB backend. It collects product pricing and availability data, exposes search and product APIs, and includes caching, rate limiting, metrics, and automated refresh behavior.

## Repository Structure

- `backend/` - Express server, scraper integration, MongoDB models, API routes, worker refresh logic, and Docker image.
- `frontend/` - React application, UI components, search and results pages, and Docker image.
- `PP_Report.md` - project report and documentation notes.

## Features

- Product search and details
- Price history aggregation
- Caching with expiration and refresh worker
- Rate limiting for API protection
- Express middleware: CORS, Helmet, compression
- Prometheus-compatible `/metrics` endpoint
- Docker-ready backend and frontend

## Prerequisites

- Node.js 14+ (recommended 18+)
- npm
- MongoDB instance
- Optional: Docker / Docker Compose

## Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file as needed.

### Recommended environment variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pricepilot
SCRAPER_API_KEY=<your-scraper-api-key>
SCRAPER_API_URL=https://api.scraperapi.com
CORS_ORIGINS=http://localhost:3000
NODE_ENV=development
```

- `SCRAPER_API_KEY` is required for live scraping support.
- If `SCRAPER_API_KEY` is not set, the backend will warn and fall back to mock scraping behavior.

### Run the backend

```bash
npm run dev
```

or production mode:

```bash
npm start
```

The backend listens on `http://localhost:5000` by default.

## Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the frontend:
   ```bash
   npm start
   ```

The frontend will start on `http://localhost:3000` and proxy API requests to the backend.

## API Endpoints

- `GET /api/test` - health check
- `GET /api/products` - product search and listing
- `GET /api/products/:id` - product detail and price history
- `GET /metrics` - Prometheus metrics

> Note: Backend routes are mounted under `/api`.

## Docker

### Backend Docker

From the project root:

```bash
cd backend
docker build -t price-pilot-backend .
docker run -p 5000:5000 --env-file .env price-pilot-backend
```

### Frontend Docker

From the project root:

```bash
cd frontend
docker build -t price-pilot-frontend .
docker run -p 80:80 price-pilot-frontend
```

## Testing

- Backend tests use `jest` and `supertest`.
- Run backend tests from `backend/`:

```bash
cd backend
npm test
```

## Notes

- `backend/src/config/config.js` controls env defaults, CORS origins, rate limiting, and cache settings.
- `backend/src/server.js` includes the metrics endpoint and refresh worker startup.
- `frontend/src` contains the React UI and search result pages.

## Contact

For questions about this repository, inspect the backend and frontend README files or open the code under `backend/` and `frontend/`.
