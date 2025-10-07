# IT Tracker Application

A Next.js application with WebSocket support for real-time issue tracking.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd ittrackker
   ```

2. **Run the application:**
   ```bash
   docker-compose up --build
   ```

3. **Wait for the build to complete** (this may take 5-10 minutes on first run)

4. **Access the application:**
   - Web App: http://localhost:3000
   - Database: localhost:5432

### Play with Docker (PWD)

1. **Go to [Play with Docker](https://labs.play-with-docker.com/)**

2. **Start a new session**

3. **Upload your code** (zip or tar.gz)

4. **Run the application:**
   ```bash
   docker-compose -f docker-compose.pwd.yml up --build
   ```

5. **Access the application** using the provided URL

## What happens during startup:

1. PostgreSQL database starts up
2. Web application builds (Next.js + Prisma)
3. Prisma generates client and pushes schema
4. Application starts on port 3000
5. WebSocket automatically connects (local) or gracefully fails (PWD)

## Environment Detection

The application automatically detects the environment:

- **Local Development**: Uses `http://localhost:3000` for WebSocket
- **Play with Docker**: Uses relative path for WebSocket (may not work due to PWD restrictions)

## Troubleshooting

### If build fails:
- Ensure Docker has enough memory (at least 4GB recommended)
- Clear Docker cache: `docker system prune -a`
- Check Docker logs: `docker-compose logs web`

### If database connection fails:
- Wait for PostgreSQL to be ready (healthcheck will handle this)
- Check database logs: `docker-compose logs postgres`

### If Prisma fails:
- The application will automatically retry Prisma commands
- Check Prisma logs in the web container

### If WebSocket doesn't work in PWD:
- This is normal due to PWD network restrictions
- The application will work without real-time features
- All other functionality remains intact

## Environment Variables

All necessary environment variables are set in `docker-compose.yml`:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT tokens
- `WEBHOOK_SECRET`: Secret for webhook verification
- `WEBHOOK_URL`: External webhook endpoint

## Architecture

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Express.js server with WebSocket support
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io for WebSocket connections (local only)

## Default Credentials

The application will create default users on first run. Check the logs for details.

## Stopping the Application

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

## Features

- ✅ **Local Development**: Full functionality with WebSocket
- ✅ **Play with Docker**: Core functionality (WebSocket may not work)
- ✅ **Auto Environment Detection**: Adapts to different environments
- ✅ **Graceful Degradation**: Works without WebSocket if needed