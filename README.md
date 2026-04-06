# RouteForge

A modern dashboard for [Apache APISIX](https://apisix.apache.org/) built with React and Spring Boot. Manage routes, upstreams, services, consumers, plugins, and SSL certificates through an intuitive visual interface with a Liquid Glass UI.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │─────>│   Backend    │─────>│  APISIX      │
│  React + TS  │ /api │ Spring Boot  │ admin│  Admin API   │
│  Vite        │<─────│ + SQLite     │<─────│              │
└──────────────┘      └──────────────┘      └──────────────┘
```

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Liquid Glass theme)
- **Backend** — Spring Boot 3.x, Maven, WebClient (proxy to APISIX Admin API)
- **Database** — SQLite for audit logs (via JPA + Flyway migrations)

## Features

- Visual form-based editing for routes and services (no raw JSON)
- Upstream management with inline node configuration
- Consumer and plugin management
- SSL certificate upload with server-side expiry parsing
- Operation audit log with filtering and pagination
- Backend-powered pagination for routes and services
- APISIX health check monitoring
- Single-admin authentication (session-based)
- Multi-tenancy: manage and switch between multiple APISIX instances

## Prerequisites

- Java 17+
- Node.js 18+
- A running Apache APISIX instance with Admin API enabled

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/RouteForge.git
cd RouteForge
```

### 2. Configure the backend

Set environment variables or edit `backend/src/main/resources/application.yml`:

| Variable | Default | Description |
|---|---|---|
| `APISIX_ADMIN_URL` | `http://127.0.0.1:9180` | APISIX Admin API base URL (used to seed the default instance) |
| `APISIX_API_KEY` | `edd1c9f034335f136f87ad84b625c8f1` | APISIX Admin API key |
| `DB_PATH` | `./data/routeforge.db` | SQLite database file path |
| `ADMIN_USERNAME` | `admin` | Dashboard login username |
| `ADMIN_PASSWORD` | `routeforge` | Dashboard login password |

### 3. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

The backend starts on `http://localhost:8080`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies `/api` requests to the backend.

### 5. Open the dashboard

Visit [http://localhost:5173](http://localhost:5173) in your browser.

## Docker Compose Deployment

The quickest way to run RouteForge in production:

```bash
docker compose up -d
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

Edit `docker-compose.yml` to configure your APISIX connection:

```yaml
environment:
  - APISIX_ADMIN_URL=http://host.docker.internal:9180  # your APISIX Admin API
  - APISIX_API_KEY=edd1c9f034335f136f87ad84b625c8f1     # your API key
  - DB_PATH=/app/data/routeforge.db
  - ADMIN_USERNAME=admin                                # dashboard login
  - ADMIN_PASSWORD=routeforge                           # dashboard password
```

> If APISIX runs on the host machine, `host.docker.internal` works on Docker Desktop (macOS/Windows). On Linux, use `--add-host=host.docker.internal:host-gateway` or the actual host IP.

To stop:

```bash
docker compose down
```

SQLite data is persisted in the `routeforge-data` Docker volume.

## Production Build (without Docker)

### Frontend

```bash
cd frontend
npm run build
```

The output is in `frontend/dist/`. Serve it with any static file server or configure your reverse proxy to serve it alongside the backend.

### Backend

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/routeforge-*.jar
```

## Project Structure

```
RouteForge/
├── backend/
│   └── src/main/java/com/routeforge/
│       ├── config/          # APISIX properties, WebClient, CORS
│       ├── controller/      # REST controllers (routes, services, ssl, etc.)
│       ├── model/entity/    # JPA entities (AuditLog)
│       ├── repository/      # Spring Data repositories
│       └── service/         # Proxy, pagination, audit services
├── frontend/
│   └── src/
│       ├── api/             # Axios client and resource APIs
│       ├── components/
│       │   ├── layout/      # AppLayout, Sidebar, PageHeader
│       │   └── ui/          # shadcn/ui components (Liquid Glass themed)
│       ├── lib/             # Utilities
│       └── pages/           # Dashboard, Routes, Services, SSL, etc.
└── README.md
```

## License

This project is licensed under [The Unlicense](https://unlicense.org/) — dedicated to the public domain. You are free to use, modify, and distribute this software for any purpose without any conditions.
