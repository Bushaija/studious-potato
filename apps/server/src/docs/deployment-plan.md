# Web Application Deployment Plan

## Project Overview
- **Application**: Fullstack Next.js with API routes
- **Backend API**: Hono.js (integrated within Next.js)
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Docker containers on Ubuntu server
- **Server**: 192.233.102.6 (shared with other applications)
- **Local Development**: `pnpm run dev`

## Architecture Overview

```
Internet → Nginx Reverse Proxy → Docker Containers
                                ├── Next.js Fullstack App (Port 3000)
                                └── PostgreSQL (Port 5432)
```

## Step 1: Docker Configuration

**Dockerfile** (project root)
```dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install production dependencies for seeding
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
RUN pnpm install tsx cross-env drizzle-kit --save-dev

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy database files for seeding
COPY --chown=nextjs:nodejs ./db ./db
COPY --chown=nextjs:nodejs ./drizzle.config.ts ./drizzle.config.ts

# Create startup script
COPY --chown=nextjs:nodejs ./docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["./docker-entrypoint.sh"]
```

**Create docker-entrypoint.sh** (project root)
```bash
#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until nc -z postgres 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
pnpm db:migrate

# Run seeding
echo "Running database seeding..."
pnpm db:seed

# Start the application
echo "Starting Next.js application..."
exec node server.js
```

**Note**: Make sure your `next.config.js` includes:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... other config
}

module.exports = nextConfig
```

### 1.2 Docker Compose Configuration

**docker-compose.yml** (project root)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ${APP_NAME}_postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5433:5432"  # Map to 5433 to avoid conflicts with existing PostgreSQL
    networks:
      - app_network
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${APP_NAME}_app
    environment:
      NODE_ENV: ${NODE_ENV}
      LOG_LEVEL: ${LOG_LEVEL}
      PORT: ${PORT}
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      EMAIL_VERIFICATION_CALLBACK_URL: ${EMAIL_VERIFICATION_CALLBACK_URL}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    networks:
      - app_network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

### 1.3 Environment Configuration

**.env** (project root)
```env
APP_NAME=myapp
DB_NAME=myapp_db
DB_USER=myapp_user
DB_PASSWORD=your_secure_password_here
DB_HOST=postgres
DB_PORT=5432
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://192.233.102.6
```

## Step 2: Server Preparation

### 2.1 Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2.2 Setup Nginx Reverse Proxy

**Install Nginx**
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Configure Nginx** (`/etc/nginx/sites-available/myapp`)
```nginx
server {
    listen 80;
    server_name 192.233.102.6 your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Handle Next.js API routes
        proxy_intercept_errors off;
        proxy_buffering off;
    }

    # Optional: serve static files directly with Nginx for better performance
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

**Enable the site**
```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 3: Database Setup

### 3.1 Database Migration Script

**init.sql**
```sql
-- Create database if not exists
-- This will be executed when PostgreSQL container starts

-- Add any initial setup queries here
-- Drizzle migrations should handle schema creation
```

### 3.2 Drizzle Configuration

**drizzle.config.ts**
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Step 4: Deployment Process

### 4.1 Project Structure
```
/var/www/myapp/
├── docker-compose.yml
├── .env
├── init.sql
├── Dockerfile
├── docker-entrypoint.sh
├── package.json
├── pnpm-lock.yaml
├── next.config.js
├── drizzle.config.ts
├── src/
│   ├── app/ (or pages/)
│   ├── components/
│   └── ... (your Next.js app structure)
├── db/
│   └── seeds/
│       └── index.ts
└── drizzle/
    └── ... (migration files)
```

### 4.2 Deployment Steps

1. **Prepare deployment directory**
```bash
sudo mkdir -p /var/www/myapp
sudo chown $USER:$USER /var/www/myapp
cd /var/www/myapp
```

2. **Upload your code**
```bash
# Using git (recommended)
git clone your-repo-url .

# Or using scp
scp -r ./your-project/* user@192.233.102.6:/var/www/myapp/
```

3. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your production values
nano .env
```

4. **Build and start containers**
```bash
docker-compose build
docker-compose up -d
```

5. **Monitor the seeding process**
```bash
# Watch logs to see migration and seeding progress
docker-compose logs -f app
```

6. **Verify deployment**
```bash
docker-compose ps
curl http://localhost:3000
curl http://localhost:3000/api/health  # if you have a health check endpoint
```

**Alternative: Manual Seeding Control**

If you prefer to control seeding manually, you can modify the docker-entrypoint.sh to skip seeding by default:

```bash
#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready
until nc -z postgres 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
pnpm db:migrate

# Only seed if SEED_DATABASE is set to true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Running database seeding..."
  pnpm db:seed
fi

# Start the application
echo "Starting Next.js application..."
exec node server.js
```

Then add `SEED_DATABASE=true` to your .env file when you want seeding to run.

## Step 5: Security Considerations

### 5.1 Firewall Configuration
```bash
# Configure UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 5.2 SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 6: Monitoring and Maintenance

### 6.1 Log Management
```bash
# View logs
docker-compose logs -f
docker-compose logs app
docker-compose logs postgres

# Log rotation (add to crontab)
docker system prune -f
```

### 6.2 Backup Strategy
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/var/backups/myapp"
mkdir -p $BACKUP_DIR
docker-compose exec postgres pg_dump -U myapp_user myapp_db > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 6.3 Update Process
```bash
# Update application
git pull origin main
docker-compose build app
docker-compose up -d

# Zero-downtime deployment (advanced)
docker-compose up -d --no-deps --build app
```

## Step 7: Troubleshooting

### Common Issues:
1. **Port conflicts**: Check if port 3000 and 5433 are available on your server
2. **Permission issues**: Ensure proper ownership of project files
3. **Network connectivity**: Verify Docker networks and container communication
4. **Database connection**: Check DATABASE_URL and container networking
5. **Build failures**: Ensure `output: 'standalone'` is set in next.config.js
6. **Better Auth issues**: Verify BETTER_AUTH_SECRET is at least 32 characters
7. **Environment variables**: Make sure all required env vars are set in production

### Health Checks:
```bash
# Container status
docker-compose ps

# Container logs
docker-compose logs app

# Enter container for debugging
docker-compose exec app sh

# Check network connectivity
docker-compose exec app ping postgres

# Check if Next.js is serving correctly
curl -I http://localhost:3000
```

This deployment plan provides a robust foundation for your application while maintaining security and scalability on your shared Ubuntu server.




 activity_id |                activity_name                 | event_id |                 event_name                 | mapping_type |     comments
-------------+----------------------------------------------+----------+--------------------------------------------+--------------+----------------------------
           1 | Other Incomes                                |        9 | Other revenue                              | DIRECT       | 
           2 | Transfers from SPIU/RBC                      |        4 | Transfers from public entities             | DIRECT       | 
           4 | Laboratory Technician A1                     |       12 | Compensation of employees                  | DIRECT       | Goods and services
           5 | Nurse A1                                     |       12 | Compensation of employees                  | DIRECT       | Goods and services
           6 | Supervision CHWs                             |       13 | Goods and services                         | DIRECT       | 
           7 | Support group meetings                       |       13 | Goods and services                         | DIRECT       | 
           8 | Sample transportation                        |       16 | Social assistance                          | DIRECT       | Goods and services
           9 | Home visit lost to follow up                 |       16 | Social assistance                          | DIRECT       | Goods and services
          10 | Transport and travel for survey/surveillance |       16 | Social assistance                          | DIRECT       | Goods and services
          11 | Infrastructure support                       |       13 | Goods and services                         | DIRECT       | 
          12 | Office supplies                              |       13 | Goods and services                         | DIRECT       | 
          13 | Transport and other cost (DHS)               |       13 | Goods and services                         | DIRECT       | 
          14 | Bank charges                                 |       13 | Goods and services                         | DIRECT       | 
          15 | Transfer to RBC                              |       14 | Grants and transfers                       | DIRECT       | 
          17 | Cash at bank                                 |       22 | Cash and cash equivalents at end of period | DIRECT       | 
          18 | Petty cash                                   |       22 | Cash and cash equivalents at end of period | DIRECT       | 
          19 | Receivables (VAT refund)                     |       23 | Advance payments                           | DIRECT       | 
          20 | Other Receivables                            |       23 | Advance payments                           | DIRECT       | 
          22 | Salaries on borrowed funds (BONUS)           |       25 | Payables                                   | DIRECT       | 
          23 | Payable - Maintenance & Repairs              |       25 | Payables                                   | DIRECT       | 
          24 | Payable - Office suppliers                   |       25 | Payables                                   | DIRECT       | 
          25 | Payable - Transportation fees                |       25 | Payables                                   | DIRECT       | 
          26 | VAT refund to RBC                            |       25 | Payables                                   | DIRECT       | 
          29 | Accumulated Surplus/Deficit                  |       29 | Accumulated surplus/(deficits)             | DIRECT       | 
          30 | Prior Year Adjustment                        |       30 | Prior year adjustments                     | DIRECT       | 

          31 | Payable bank charges                         |       30 | Payable                                    | DIRECT       | 
          32 | Payable new grants                           |       30 | Payable                                    | DIRECT       | 