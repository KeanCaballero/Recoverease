#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        RecoverEase — Dev Setup           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── Prerequisites check ──────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo -e "${RED}✗ Node.js not found. Install Node.js 20+ from https://nodejs.org${NC}"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo -e "${RED}✗ npm not found.${NC}"; exit 1; }

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ required (found v${NODE_VER}). Please upgrade.${NC}"; exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# ─── Backend setup ────────────────────────────────────────────────────────────
echo -e "\n${BLUE}▶ Setting up backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo -e "${YELLOW}  ⚠  No .env file found — created one from .env.example.${NC}"
  echo -e "${YELLOW}     Before continuing, open backend/.env and set:${NC}"
  echo -e "${YELLOW}       DATABASE_URL  — Supabase Transaction connection string${NC}"
  echo -e "${YELLOW}       DIRECT_URL   — Supabase Session connection string${NC}"
  echo -e "${YELLOW}     Find these in: Supabase Dashboard → Settings → Database${NC}"
  echo ""
  echo -e "${YELLOW}  Press Enter once you have saved your .env file, or Ctrl+C to abort.${NC}"
  read -r
fi

# Validate that DATABASE_URL has been changed from the placeholder
if grep -q "project-ref" .env; then
  echo -e "${RED}✗ backend/.env still contains placeholder values.${NC}"
  echo -e "${RED}  Please replace DATABASE_URL and DIRECT_URL with your real Supabase connection strings.${NC}"
  exit 1
fi

echo "  Installing backend dependencies..."
npm install --silent

echo "  Generating Prisma client..."
npx prisma generate --silent

echo "  Pushing database schema to Supabase..."
npx prisma db push --accept-data-loss

echo "  Seeding database with demo data..."
npx tsx src/seed.ts

cd ..

# ─── Frontend setup ───────────────────────────────────────────────────────────
echo -e "\n${BLUE}▶ Setting up frontend...${NC}"
cd frontend
echo "  Installing frontend dependencies..."
npm install --silent
cd ..

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Demo credentials:${NC}"
echo -e "  Admin:   admin@recoverease.app     / Admin@123"
echo -e "  Doctor:  dr.santos@recoverease.app / Doctor@123"
echo -e "  Patient: juan.dela.cruz@email.com  / Patient@123"
echo ""
echo -e "${BLUE}Starting development servers...${NC}"
echo -e "  API:      ${GREEN}http://localhost:3001${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo ""

# Start both servers concurrently
(cd backend  && npm run dev) &
(cd frontend && npm run dev) &

wait
