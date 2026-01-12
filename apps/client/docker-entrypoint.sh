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