#!/bin/bash
# Run Next.js development server with cleared ports
echo "Checking for and killing processes on ports 3000-3010..."
for port in $(seq 3000 3010); do
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
done

echo "Starting Next.js development server..."
npm run dev
