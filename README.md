# Palladium 🔺

**Palladium** is an open-source Avalanche L1 chain explorer that indexes every Avalanche L1, tracks health metrics (such as validators, TVL, transactions, and gas), and exposes a public dashboard alongside a RESTful API. Think of it as "L1Beat for Avalanche."

## 🚀 Functionality & Features

- **Automated Chain Discovery**: Automatically finds and indexes new Avalanche L1s (Subnets).
- **Comprehensive Metrics Tracking**: Monitors Daily Active Validators, Total Stake Weight, Total Value Locked (TVL), transaction counts, and gas prices across networks.
- **REST API**: Provides public, read-only endpoints to access aggregated ecosystem stats, paginated chain listings, time-series metrics, and detailed validator information.
- **Interactive Dashboard**: A responsive Next.js frontend featuring overview stats, TVL/Tx leaderboards, and detailed per-chain metric charts.

## 🏗 Architecture & Tech Stack

Palladium is built as a highly modular `pnpm` monorepo containing three main workspaces:

- **Frontend (`apps/web`)**: Next.js 16 (App Router, Turbopack), Tailwind CSS v4, and Recharts for interactive data visualization.
- **Backend API (`apps/server`)**: A lightweight and fast REST API built with Hono and `@hono/node-server`, written in TypeScript.
- **Shared Packages (`packages/shared`)**: Contains the Drizzle ORM database schema, shared TypeScript types, constants, and utilities.
- **Scripts (`scripts/`)**: A collection of utility scripts for database seeding, manual ingestion, and specific data operations.

**Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless`) managed via Drizzle ORM.

## 🔄 How It Works (Ingestion Pipeline)

Data is kept fresh via a sequential 4-step automated ingestion pipeline triggered by a cron job or manual script (`pnpm seed`):

1. **Chain Discovery**: Fetches the latest subnets and chains directly from the **Glacier API**.
2. **Validator Indexing**: Queries the Avalanche **P-Chain** via JSON-RPC to count active validators and total stake weight per chain.
3. **TVL Aggregation**: Matches chains against the **DeFiLlama API** to pull current Total Value Locked (in USD).
4. **EVM Metrics Collection**: Connects to individual chain **EVM RPCs** to track block times, average gas prices, and calculate daily transaction estimates.

All metrics are recorded on a daily basis (time-series format), allowing historical trend visualization up to 90 days.

## 🗄️ Database Schema

The PostgreSQL database (via Neon) is composed of 4 key tables:

- `chains`: Stores metadata for all discovered Avalanche L1s (slug, ids, RPC urls, VM types).
- `chain_metrics`: Daily time-series metrics per chain (TVL, validator count, tx counts, gas/block averages).
- `chain_validators`: Detailed per-validator records mapped to specific chains.
- `ingestion_log`: An audit trail of all ingestion job executions and potential failures.

## 🛠 Getting Started

### Prerequisites

- Node.js (v20+)
- `pnpm` (v9+)
- A Neon PostgreSQL Database URL

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repo-url> palladium
   cd palladium
   pnpm install
   ```

2. **Environment Setup:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb"
   CRON_SECRET="your-secret-token"
   PORT=8787
   ```
   Create an `.env.local` inside `apps/web/`:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:8787"
   ```

3. **Database Migration:**
   Push the Drizzle schema to your Neon database:
   ```bash
   pnpm db:push
   ```

### Running the App

Run both the Hono backend and Next.js frontend simultaneously from the root directory:
```bash
pnpm dev
```

- **Frontend**: Runs on `http://localhost:3000`
- **Backend API**: Runs on `http://localhost:8787`

### Useful Commands

- `pnpm seed`: Runs the full 4-step data ingestion pipeline to populate the database.
- `pnpm build`: Builds the shared package, backend server, and frontend application for production.
- `pnpm db:studio`: Opens Drizzle Studio to inspect the database manually in your browser.

---

*(See `CLAUDE.md` and `skills.md` for more in-depth development guidelines and architecture details.)*
