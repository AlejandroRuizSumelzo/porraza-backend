# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Porraza** is a sports prediction platform (backend API) for major football tournaments (e.g., World Cup). Users predict match outcomes and individual awards (top scorer/Pichichi and MVP). They compete in leagues (public/private) and are ranked by a points system with real-time leaderboards.

This is a NestJS backend application built with TypeScript, following **Clean Architecture** principles.

### Domain Context

**Key User Flows:**
- **Registration/Login:** User authentication and account management
- **League Management:** Join existing leagues or create new ones (public/private)
- **Predictions:** Submit and edit predictions for tournament phases:
  - Group stage matches
  - Knockout stage matches
  - Individual awards (Pichichi, MVP)
- **Prediction Locking:** Each match and award has a lock deadline after which predictions cannot be modified
- **Leaderboards:** View rankings (global and per league) with detailed point breakdowns

## Development Commands

**Package Manager:** This project uses `pnpm` (not npm or yarn).

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm run start:dev    # Development with hot-reload
pnpm run start:debug  # Debug mode with watch
pnpm run start        # Standard start
```

### Production
```bash
pnpm run build        # Compile TypeScript to dist/
pnpm run start:prod   # Run compiled code from dist/
```

### Testing
```bash
pnpm run test              # Run unit tests
pnpm run test:watch        # Unit tests in watch mode
pnpm run test:e2e          # Run e2e tests
pnpm run test:cov          # Run tests with coverage
pnpm run test:debug        # Debug tests with Node inspector
```

### Code Quality
```bash
pnpm run lint     # Lint and auto-fix TypeScript files
pnpm run format   # Format code with Prettier
```

## Architecture

This project follows **Clean Architecture** principles, organizing code by layers with strict dependency rules.

### Clean Architecture Layers

The application is divided into the following layers, from innermost to outermost:

#### 1. Domain Layer (Innermost)
The heart of the application, completely isolated from external dependencies.

**Entities:**
- Represent core business logic and data that would exist even without the application
- Contain business rules that are intrinsic to the enterprise
- Examples: User, League, Match, Prediction, Award (Pichichi/MVP)
- Define validation rules (e.g., a prediction requires a user, match, and predicted score)
- Could be shared across multiple applications within the organization

**Use Cases (Application Logic):**
- Represent application-specific business logic
- Orchestrate the flow of data between entities and the outside world
- Examples:
  - CreatePrediction: Validate prediction deadline, check lock status, save prediction
  - CalculateLeagueRanking: Gather all predictions, calculate points, generate leaderboard
  - JoinLeague: Validate league access, add user to league
- Coordinate between multiple entities (e.g., send email, manage stock, generate invoice)
- Define abstractions (interfaces/ports) that adapters must implement (Dependency Inversion Principle)

#### 2. Adapters Layer
Transform data between the domain's representation and external formats.

**Responsibilities:**
- Convert HTTP requests/responses to/from domain entities
- Transform domain entities to/from database models
- Implement interfaces defined by use cases (repositories, gateways)
- Common patterns: Controllers, Presenters, ViewModels, Repositories, Gateways

**Examples:**
- REST Controllers: Transform HTTP JSON to domain entities
- Database Repositories: Map domain entities to ORM models
- Email Gateways: Send notifications based on domain events

#### 3. Infrastructure Layer (Outermost - Frameworks & Drivers)
Contains all external frameworks, libraries, and implementation details.

**Examples:**
- NestJS framework and decorators
- TypeORM or Prisma (database ORM)
- HTTP/REST libraries
- Email services (e.g., SendGrid, Nodemailer)
- Authentication libraries (e.g., Passport, JWT)
- Data formats (JSON, XML)

### The Dependency Rule

**Critical principle:** Dependencies must point inward only.

- **Inner layers** (Domain) must **never** depend on outer layers (Adapters, Infrastructure)
- **Outer layers** can depend on inner layers
- Domain logic is the most stable and should not depend on frequently-changing implementation details
- Use **Dependency Inversion Principle** to allow outer layers to implement interfaces defined by inner layers

**Example:**
```
Infrastructure (TypeORM) → Adapters (UserRepository) → Domain (IUserRepository interface)
                                                      ↑
                                                      |
                                                  Use Case depends on IUserRepository
```

### Module System
NestJS uses a modular architecture where:
- **Modules** (`@Module` decorator) organize application structure and encapsulate providers
- **Controllers** handle HTTP requests and route to services
- **Providers/Services** contain business logic
- Entry point is [src/main.ts](src/main.ts) which bootstraps AppModule
- Modules should be organized by Clean Architecture layers (domain, adapters, infrastructure)

### TypeScript Configuration
- **Module system:** NodeNext with ESModuleInterop
- **Target:** ES2023
- **Decorators:** Enabled (required for NestJS)
- **Strict null checks:** Enabled
- **Output directory:** `dist/`

### Testing Strategy
- **Unit tests:** Located alongside source files as `*.spec.ts`
- **E2E tests:** Located in `test/` directory
- **Test framework:** Jest with ts-jest transformer
- **Root directory for unit tests:** `src/`

### Linting & Formatting
- **ESLint:** Uses flat config (eslint.config.mjs) with TypeScript type-checked rules
- **Prettier:** Configured with single quotes and trailing commas
- **Notable rules:**
  - `@typescript-eslint/no-explicit-any`: off
  - `@typescript-eslint/no-floating-promises`: warn
  - End of line handling: auto (cross-platform compatibility)

### Server Configuration
- Default port: 3000 (configurable via `PORT` environment variable)
- Application created via `NestFactory.create(AppModule)` in [main.ts](src/main.ts)

## NestJS CLI

The project uses `@nestjs/cli` for scaffolding. Common commands:
```bash
nest generate module <name>      # Generate new module
nest generate controller <name>  # Generate controller
nest generate service <name>     # Generate service
nest generate resource <name>    # Generate complete CRUD resource
```

## Database Schema

This project uses **PostgreSQL 18** with **direct SQL queries** (no ORM). The database schema is designed for the FIFA World Cup 2026 tournament.

### Database Technology Stack
- **Database:** PostgreSQL 18
- **Query approach:** Direct SQL queries (no TypeORM/Prisma)
- **Connection:** Node.js PostgreSQL driver (`pg` package recommended)

### Core Tables

#### 1. `teams` - National Teams
Stores all 48 qualified teams plus 64 TBD placeholder teams for knockout stages.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `name` (VARCHAR(100)): Full team name (e.g., "Argentina", "TBD 1")
- `fifa_code` (VARCHAR(3), UNIQUE): FIFA code (e.g., "ARG", "BRA", "TBD01"-"TBD64")
- `confederation` (VARCHAR(10)): AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA, or "TBD"
- `is_host` (BOOLEAN): TRUE for Mexico, USA, Canada
- `created_at`, `updated_at` (TIMESTAMPTZ): Auto-managed timestamps

**Team Distribution:**
- Real teams: 48 (CONCACAF: 11, AFC: 8, CAF: 9, CONMEBOL: 6, OFC: 1, UEFA: 16)
- TBD placeholders: 64 (fifa_code: 'TBD01' to 'TBD64' for knockout stages)

**Important Notes:**
- Frontend should detect TBD teams with `fifa_code.startsWith('TBD')` and display "Por definir"
- Team images are managed in frontend (path: `/images/teams/{fifa_code}.png`)
- TBD teams use confederation = 'TBD'

#### 2. `stadiums` - World Cup Venues
16 stadiums across Mexico, USA, and Canada.

**Columns:**
- `id` (UUID, PK)
- `code` (VARCHAR(50), UNIQUE): Identifier for images (e.g., "MEX_CDMX_AZTECA", "USA_LA_SOFI")
- `name` (VARCHAR(150)): Official name (e.g., "Estadio Azteca", "SoFi Stadium")
- `city` (VARCHAR(100)): City name
- `country` (VARCHAR(3)): MEX, USA, CAN
- `timezone` (VARCHAR(50)): IANA timezone (e.g., "America/Mexico_City", "America/Los_Angeles")
- `capacity` (INTEGER): Stadium capacity
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Stadium images:** `/images/stadiums/{code}.png` (frontend managed)

#### 3. `groups` - Tournament Groups
12 groups (A through L) for the group stage.

**Columns:**
- `id` (UUID, PK)
- `name` (CHAR(1), UNIQUE): Group letter (A-L)
- `created_at` (TIMESTAMPTZ)

**Constraint:** `CHECK (name >= 'A' AND name <= 'L')`

#### 4. `group_standings` - Group Stage Team Assignments
Manages team assignments to groups and tracks group stage statistics.

**Columns:**
- `id` (UUID, PK)
- `group_id` (UUID, FK → groups.id): Reference to group
- `team_id` (UUID, FK → teams.id): Reference to team
- `position` (INTEGER): Final position in group (1-4)
- `points` (INTEGER, DEFAULT 0): Total points (3 per win, 1 per draw)
- `matches_played` (INTEGER, DEFAULT 0): Matches played (max 3)
- `wins`, `draws`, `losses` (INTEGER, DEFAULT 0): Match results
- `goals_for`, `goals_against` (INTEGER, DEFAULT 0): Goals scored/conceded
- `goal_difference` (INTEGER, DEFAULT 0): Auto-calculated by trigger
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- `UNIQUE(group_id, team_id)`: Each team appears once per group
- `UNIQUE(group_id, position)`: Each position is unique within group
- `CHECK (wins + draws + losses = matches_played)`: Statistics integrity
- `CHECK (matches_played >= 0 AND matches_played <= 3)`: Max 3 group matches

**Trigger:** `calculate_goal_difference` auto-updates `goal_difference = goals_for - goals_against`

#### 5. `matches` - All Tournament Matches
Contains all 104 World Cup matches (72 group stage + 32 knockout).

**Columns (in database order):**
- `id` (UUID, PK)
- `match_number` (INTEGER, UNIQUE): Official match number (1-104)
- `home_team_id`, `away_team_id` (UUID, FK → teams.id): Participating teams (references TBD teams for knockout)
- `home_team_placeholder`, `away_team_placeholder` (VARCHAR(150), NULLABLE): Descriptive text for knockout matches (e.g., "Group A winners", "Winner match 74"). NULL for group stage matches.
- `stadium_id` (UUID, NOT NULL, FK → stadiums.id): Match venue
- `group_id` (UUID, FK → groups.id): Only for GROUP_STAGE matches, NULL for knockout stages
- `phase` (ENUM): 'GROUP_STAGE', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL'
- `match_date` (DATE, NOT NULL): Match date
- `match_time` (TIME, NOT NULL, DEFAULT '20:00:00'): Kickoff time
- `home_score`, `away_score` (INTEGER, NULLABLE): Regular time score (NULL until match finishes)
- `home_score_et`, `away_score_et` (INTEGER, NULLABLE): Extra time cumulative score (knockout only, NULL otherwise)
- `home_penalties`, `away_penalties` (INTEGER, NULLABLE): Penalty shootout score (knockout only, NULL otherwise)
- `status` (ENUM, DEFAULT 'SCHEDULED'): 'SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'
- `predictions_locked_at` (TIMESTAMPTZ, NOT NULL): Deadline for predictions (1 hour before first match globally)
- `depends_on_match_ids` (INTEGER[], NULLABLE): Array of match_numbers that define the teams for this match (NULL for group stage, populated for knockout)
- `created_at`, `updated_at` (TIMESTAMPTZ): Auto-managed timestamps

**Constraints:**
- `CHECK (match_number >= 1 AND match_number <= 104)`
- `CHECK (phase = 'GROUP_STAGE' AND group_id IS NOT NULL) OR (phase != 'GROUP_STAGE' AND group_id IS NULL)`
- Scores must be non-negative when present

**Match Distribution:**
- Group Stage (1-72): 12 groups × 6 matches = 72 matches
  - Jornada 1: Matches 1-24 (June 11-17, 2026)
  - Jornada 2: Matches 25-48 (June 18-23, 2026)
  - Jornada 3: Matches 49-72 (June 24-27, 2026) - Simultaneous final matches per group
- Round of 32 (73-88): 16 matches (June 28 - July 3, 2026)
- Round of 16 (89-96): 8 matches (July 4-7, 2026)
- Quarter-finals (97-100): 4 matches (July 9-11, 2026)
- Semi-finals (101-102): 2 matches (July 14-15, 2026)
- Third Place (103): 1 match (July 18, 2026)
- Final (104): 1 match (July 19, 2026)

**Prediction Locking:**
- All matches share the same global deadline: **June 12, 2026, 02:00 UTC+2** (equivalent to June 11, 2026, 19:00 America/Mexico_City) - 1 hour before Match 1
- After this time, NO predictions can be created or modified for ANY match
- Stored as `predictions_locked_at` TIMESTAMPTZ in the database

**TBD Team Management:**
- Knockout matches reference TBD teams (fifa_code 'TBD01'-'TBD64')
- `home_team_placeholder` and `away_team_placeholder` provide context (e.g., "Winner match 89")
- `depends_on_match_ids` tracks which matches determine the actual teams
- When group stage ends, backend updates knockout matches replacing TBD teams with qualified teams

**Example Match Record (Group Stage):**
```
Match #1: Mexico vs New Zealand
- id: e096dcb1-9f20-4ce5-89ac-740d41283fb9
- match_number: 1
- home_team_id: d8357f2b-e7be-47ad-8e06-997d09017409 (Mexico)
- away_team_id: 5b071bac-ca7b-4d43-ad89-aec49b7a9125 (New Zealand)
- home_team_placeholder: NULL (not needed for group stage)
- away_team_placeholder: NULL (not needed for group stage)
- stadium_id: fd2c4c48-1a2d-4404-8a61-3c463e3e1604 (Estadio Azteca)
- group_id: 3cbeb5b0-65b6-4c5c-b18b-7d495e8d8ada (Group A)
- phase: GROUP_STAGE
- match_date: 2026-06-11
- match_time: 20:00:00
- home_score: NULL (match not played yet)
- away_score: NULL
- home_score_et: NULL
- away_score_et: NULL
- home_penalties: NULL
- away_penalties: NULL
- status: SCHEDULED
- predictions_locked_at: 2026-06-12 02:00:00.000 +0200
- depends_on_match_ids: NULL (group stage matches don't depend on others)
- created_at: 2025-10-21 11:49:19.503 +0200
- updated_at: 2025-10-21 11:49:19.503 +0200
```

### Database Triggers

#### Auto-update Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: teams, stadiums, group_standings, matches
```

#### Auto-calculate Goal Difference
```sql
CREATE OR REPLACE FUNCTION calculate_goal_difference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.goal_difference = NEW.goals_for - NEW.goals_against;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to: group_standings
```

### Indexes
- `teams`: fifa_code, confederation
- `stadiums`: code, country
- `groups`: name
- `group_standings`: group_id, team_id, (group_id, position)
- `matches`: phase, match_date, group_id (partial: WHERE group_id IS NOT NULL), status, predictions_locked_at, home_team_id (partial: WHERE NOT NULL), away_team_id (partial: WHERE NOT NULL)

### Key Design Decisions

1. **No ORM:** Direct SQL queries for maximum control and performance
2. **UUIDs vs Serial IDs:** UUIDs for security and distributed scalability
3. **TBD Teams as Real Entities:** Simplifies queries - all matches always have home/away teams (never NULL)
4. **Placeholder Fields:** Keep human-readable descriptions alongside TBD team references
5. **Global Prediction Deadline:** Single deadline (1h before tournament start) simplifies logic and UX
6. **Array for Dependencies:** `depends_on_match_ids` as INTEGER[] avoids junction table for simple relationships
7. **Separate ET/Penalty Scores:** Preserves regular time result while tracking overtime outcomes
8. **TIMESTAMPTZ:** All timestamps with timezone for international tournament across 3 countries/multiple timezones

### Common Queries

**Get all group stage matches for a specific group:**
```sql
SELECT m.*, ht.name as home_team, at.name as away_team, s.name as stadium
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
JOIN stadiums s ON m.stadium_id = s.id
WHERE m.group_id = (SELECT id FROM groups WHERE name = 'A')
ORDER BY m.match_number;
```

**Get knockout matches with TBD placeholders:**
```sql
SELECT m.match_number, m.phase, m.home_team_placeholder, m.away_team_placeholder,
       ht.fifa_code as home_code, at.fifa_code as away_code,
       m.match_date, s.name as stadium
FROM matches m
JOIN teams ht ON m.home_team_id = ht.id
JOIN teams at ON m.away_team_id = at.id
JOIN stadiums s ON m.stadium_id = s.id
WHERE m.phase != 'GROUP_STAGE'
  AND (ht.fifa_code LIKE 'TBD%' OR at.fifa_code LIKE 'TBD%')
ORDER BY m.match_number;
```

**Get group standings for a specific group:**
```sql
SELECT t.name, t.fifa_code, gs.position, gs.points, gs.goals_for, gs.goals_against, gs.goal_difference
FROM group_standings gs
JOIN teams t ON gs.team_id = t.id
JOIN groups g ON gs.group_id = g.id
WHERE g.name = 'A'
ORDER BY gs.position;
```

### Migration Strategy

When implementing database changes:
1. Write SQL migration scripts (no ORM migrations)
2. Include both `UP` and `DOWN` migrations
3. Test on local PostgreSQL 18 instance
4. Version migrations with timestamps (e.g., `20260115_create_matches_table.sql`)
5. Store migrations in `database/migrations/` directory

## Payments with Stripe

This project implements **Stripe Embedded Checkout** for a one-time payment of **€1.99** to access premium features.

### Payment Flow Overview

1. **User creates account** → Email verification required
2. **User logs in** → Receives JWT access token
3. **User requests checkout** → Backend creates Stripe session
4. **User completes payment** → Stripe Embedded Checkout (in frontend)
5. **Stripe sends webhook** → Backend updates user's payment status
6. **User gets access** → Premium features unlocked

### Architecture

The payment system follows **Clean Architecture** with clear separation of concerns:

```
Domain Layer (Core Business Logic)
├── entities/user.entity.ts (hasPaid, paymentDate, stripeCustomerId)
└── repositories/
    ├── payment.repository.interface.ts (IPaymentRepository)
    └── user.repository.interface.ts (updatePaymentStatus method)

Application Layer (Use Cases)
└── use-cases/payments/
    ├── create-checkout-session.use-case.ts
    ├── verify-payment-status.use-case.ts
    ├── get-session-status.use-case.ts
    └── handle-stripe-webhook.use-case.ts

Infrastructure Layer (External Services)
└── stripe/
    ├── stripe.module.ts (Global Stripe client)
    └── stripe-payment.service.ts (implements IPaymentRepository)

Adapters Layer (HTTP/REST)
├── controllers/payment.controller.ts
└── dtos/payment/
    ├── checkout-session-response.dto.ts
    ├── payment-status-response.dto.ts
    └── session-status-response.dto.ts

Modules (NestJS DI)
└── payment/payment.module.ts
```

### Database Schema

Payment-related fields in the `users` table:

```sql
-- Payment fields (added to existing users table)
has_paid BOOLEAN DEFAULT FALSE,
payment_date TIMESTAMPTZ NULL,
stripe_customer_id VARCHAR(255) NULL,
stripe_session_id VARCHAR(255) NULL
```

**Migration SQL:**
```sql
ALTER TABLE users
ADD COLUMN has_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_date TIMESTAMPTZ NULL,
ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
ADD COLUMN stripe_session_id VARCHAR(255) NULL;

CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/payments/create-checkout-session` | JWT | Creates Stripe checkout session |
| `GET` | `/payments/verify-status` | JWT | Checks if user has paid (from DB) |
| `GET` | `/payments/session-status/:sessionId` | JWT | Checks session status (from Stripe) |
| `POST` | `/payments/webhook` | Stripe signature | Receives payment confirmation |

### Environment Variables

**Required in `.env`:**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxx           # Secret key (backend only, NEVER expose)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx      # Publishable key (safe for frontend)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # Webhook signing secret
STRIPE_PRICE_ID=price_xxxxx               # Price ID for €1.99 product

# Frontend URL (for redirect after payment)
FRONTEND_URL=http://localhost:3000
```

### Stripe Configuration Steps

#### 1. Create Product in Stripe Dashboard

1. Go to **Stripe Dashboard → Products** (https://dashboard.stripe.com/test/products)
2. Click **"Add product"**
3. Configure:
   - **Name:** "Porraza Access Pass"
   - **Description:** "Acceso completo al torneo Porraza"
   - **Pricing:** One-time payment, €1.99, EUR
4. Save and **copy the `price_id`** (starts with `price_`)

#### 2. Get API Keys

1. Go to **Stripe Dashboard → Developers → API keys** (https://dashboard.stripe.com/test/apikeys)
2. Copy:
   - **Secret key** (sk_test_...) → Backend only
   - **Publishable key** (pk_test_...) → Frontend only

#### 3. Configure Webhooks

**For Local Development (Stripe CLI):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS

# Authenticate
stripe login

# Forward webhooks to local backend (IMPORTANT: Port 3001, not 4242!)
stripe listen --forward-to http://localhost:3001/payments/webhook
```

Copy the `whsec_` secret from the output and add it to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**For Production (Stripe Dashboard):**
1. Go to **Stripe Dashboard → Developers → Webhooks** (https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. URL: `https://your-domain.com/payments/webhook`
4. Events: Select `checkout.session.completed`
5. Copy the **Signing secret** and add to production `.env`

### Testing Payments

**Test Cards (Stripe Test Mode):**
- **Success:** `4242 4242 4242 4242`
- **Declined:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- **Expiry:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any code (e.g., 12345)

**Test Workflow:**

```bash
# 1. Start backend
pnpm run start:dev

# 2. Start Stripe webhook listener (in another terminal)
stripe listen --forward-to http://localhost:3001/payments/webhook

# 3. Login to get JWT token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 4. Create checkout session
curl -X POST http://localhost:3001/payments/create-checkout-session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response: { "clientSecret": "cs_test_...", "sessionId": "cs_test_..." }

# 5. Verify payment status (before payment)
curl http://localhost:3001/payments/verify-status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response: { "hasPaid": false, "paymentDate": null }

# 6. Complete payment in frontend with test card 4242 4242 4242 4242

# 7. Verify payment status (after payment)
curl http://localhost:3001/payments/verify-status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response: { "hasPaid": true, "paymentDate": "2025-10-24T..." }
```

### Webhook Processing

When a payment is completed, Stripe sends a `checkout.session.completed` event to `/payments/webhook`:

**Flow:**
1. Stripe sends webhook with signature in `stripe-signature` header
2. Backend validates signature with `STRIPE_WEBHOOK_SECRET`
3. If valid, extracts `userId` from session metadata
4. Updates user in database: `has_paid = true`, `payment_date = NOW()`
5. Returns `200 OK` to Stripe (required to acknowledge receipt)

**Important:**
- Webhooks are **NOT authenticated with JWT** (validated by Stripe signature)
- Backend must have `rawBody: true` in [src/main.ts](src/main.ts) to verify signatures
- If signature verification fails, returns `400 Bad Request`

### Security Considerations

1. **API Keys:**
   - Secret key (`sk_`) → Backend only, NEVER expose to frontend
   - Publishable key (`pk_`) → Safe for frontend, public
   - Webhook secret (`whsec_`) → Backend only, validates webhook authenticity

2. **Prevent Duplicate Payments:**
   - `CreateCheckoutSessionUseCase` checks `user.hasPaid` before creating session
   - Returns `400 Bad Request` if user already paid

3. **CORS Configuration:**
   - Payments endpoints require JWT authentication (except webhook)
   - Webhook validated by Stripe signature, not JWT

4. **Database Constraints:**
   - `has_paid` defaults to `FALSE`
   - `payment_date` is `NULL` until payment completes
   - Index on `stripe_customer_id` for fast lookups

### Frontend Integration Guide

**Frontend Tech Stack:** Next.js 15 with App Router, TypeScript, Tailwind CSS

**Required npm packages:**
```bash
npm install @stripe/stripe-js
```

**Environment variables (frontend `.env.local`):**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Example React Component:**

```typescript
// app/checkout/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    // Fetch client secret from backend
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  if (!clientSecret) {
    return <div>Loading checkout...</div>;
  }

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ clientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```

**Success Page:**
```typescript
// app/checkout/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/session-status/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )
        .then((res) => res.json())
        .then((data) => setStatus(data));
    }
  }, [sessionId]);

  if (!status) return <div>Loading...</div>;

  return (
    <div>
      {status.hasPaid ? (
        <div>
          <h1>Payment Successful!</h1>
          <p>Thank you for your payment.</p>
          <p>Payment completed at: {new Date(status.paymentDate).toLocaleString()}</p>
        </div>
      ) : (
        <div>
          <h1>Payment Pending</h1>
          <p>Your payment is being processed...</p>
        </div>
      )}
    </div>
  );
}
```

### Troubleshooting

**Common Issues:**

1. **Webhook signature verification fails:**
   - Check `STRIPE_WEBHOOK_SECRET` is correct in `.env`
   - Ensure `rawBody: true` is set in [src/main.ts](src/main.ts)
   - Verify Stripe CLI is forwarding to correct port (3001, not 4242)

2. **"STRIPE_PRICE_ID is not configured":**
   - Create product in Stripe Dashboard
   - Copy `price_id` and add to `.env`
   - Restart backend

3. **User already paid error:**
   - This is expected behavior (prevents duplicate payments)
   - Check `users.has_paid` in database

4. **Webhook not received:**
   - Check Stripe CLI is running: `stripe listen --forward-to http://localhost:3001/payments/webhook`
   - Check backend logs for webhook events
   - Verify firewall allows connections on port 3001

**Debug Commands:**

```bash
# Check if backend is running
curl http://localhost:3001

# Check Stripe webhook secret
echo $STRIPE_WEBHOOK_SECRET

# View recent Stripe events
stripe events list

# Test webhook manually
stripe trigger checkout.session.completed
```

## Deployment & Infrastructure

This application is deployed on a **Hetzner Cloud Server** running Ubuntu 22.04 LTS using Docker containers and automated CI/CD with GitHub Actions.

### Deployment Environment

**Server Details:**
- **Provider:** Hetzner Cloud
- **OS:** Ubuntu 22.04.5 LTS (GNU/Linux 5.15.0-151-generic x86_64)
- **Server Name:** porraza-server
- **Deployment User:** `porraza` (non-root user with Docker permissions)
- **Admin Access:** `root` (for server administration and SSH)
- **Project Directory:** `/home/porraza/porraza-backend`

**Container Stack:**
- **Backend:** NestJS app in Docker container (port 3001)
- **Database:** PostgreSQL 18 in Docker container (port 5432)
- **Orchestration:** Docker Compose
- **Container Names:** `porraza_backend`, `porraza_postgres`

### Deployment Architecture

```
GitHub Repository (main branch)
         ↓
GitHub Actions Workflow (.github/workflows/deploy.yml)
         ↓
SSH as root → sudo -u porraza
         ↓
/home/porraza/porraza-backend
         ↓
deploy-local.sh script
         ↓
Docker Compose (build + deploy)
         ↓
Production Containers Running
```

### Deployment Scripts

The project includes three deployment-related scripts:

#### 1. `deploy-local.sh` (Primary Deployment Script)
**Purpose:** Main deployment script executed on the server by the `porraza` user
**Location:** `/home/porraza/porraza-backend/deploy-local.sh`
**Permissions:** Must be executable by `porraza` user

**Steps:**
1. Verifies project directory structure
2. Pulls latest code from GitHub (`git fetch` + `git reset --hard origin/main`)
3. Validates `.env` file exists (creates from `.env.example` if needed)
4. Checks Docker permissions for `porraza` user
5. Stops existing containers (`docker compose down`)
6. Builds backend image with `--no-cache` flag
7. Starts services (`docker compose up -d`)
8. Waits for health check (60 attempts × 2 seconds = 120s max)
9. Displays container status, logs, and access URLs
10. Cleans up old Docker images

**Key Features:**
- Color-coded output (Blue, Green, Yellow, Red, Cyan)
- Detailed progress logging with step indicators (1/6, 2/6, etc.)
- Health check validation (checks for "healthy" status)
- Automatic cleanup of dangling images
- Displays useful post-deployment commands

**Exit Conditions:**
- Missing `package.json` or `docker-compose.yml`
- Missing `.env` file (prompts user to create and edit)
- No Docker permissions (instructs to add user to `docker` group)

#### 2. `deploy.sh` (Legacy/Alternative Deployment Script)
**Purpose:** Alternative deployment script designed for root execution
**Location:** `/home/porraza/porraza-backend/deploy.sh`
**Target Directory:** `/opt/porraza-backend` (different from current setup)
**Status:** Not currently used in CI/CD workflow

**Differences from deploy-local.sh:**
- Requires root/sudo permissions
- Uses `/opt/porraza-backend` instead of `~/porraza-backend`
- Includes repository cloning logic (not just pulling)
- Uses `docker-compose` (hyphenated) instead of `docker compose`

**Note:** This script is kept for reference but the current deployment uses `deploy-local.sh` with the `porraza` user.

#### 3. `verify-deployment.sh` (Verification & Diagnostics)
**Purpose:** Post-deployment verification and health check script
**Location:** `/home/porraza/porraza-backend/verify-deployment.sh`

**Checks Performed:**
1. Docker accessibility for current user
2. Presence of `docker-compose.yml`
3. Container status (`docker compose ps`)
4. Backend container running state
5. PostgreSQL container running state
6. Backend health check (10 attempts × 1 second)
7. HTTP endpoint testing (`http://localhost:3001` and external IP)
8. PostgreSQL connection (`pg_isready`)
9. Recent logs (`docker compose logs --tail=20`)
10. Resource usage (`docker stats`)
11. Firewall status (checks `ufw` for port 3001)

**Usage:**
```bash
cd ~/porraza-backend
./verify-deployment.sh
```

### GitHub Actions CI/CD Workflow

**File:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
**Triggers:**
- Push to `main` branch (automatic)
- Manual trigger via `workflow_dispatch`

**Environment Variables:**
- `NODE_ENV: production`
- `SERVER_HOST`: GitHub secret (Hetzner server IP)
- `SERVER_USER`: GitHub secret (should be `root`)
- `SSH_PRIVATE_KEY`: GitHub secret (root's SSH private key)

**Workflow Jobs:**

#### Job 1: `deploy`
**Timeout:** 15 minutes
**Runner:** ubuntu-latest

**Steps:**
1. **Checkout code:** Uses `actions/checkout@v4`
2. **Setup SSH Key:** Uses `webfactory/ssh-agent@v0.9.0` with `SSH_PRIVATE_KEY` secret
3. **Add server to known hosts:** Runs `ssh-keyscan` to avoid fingerprint prompt
4. **Deploy to Hetzner Server:**
   - SSH as `$SERVER_USER` (root)
   - Execute: `sudo -u porraza bash -c 'cd ~/porraza-backend && bash ./deploy-local.sh'`
   - Runs deployment as `porraza` user via sudo
5. **Verify Deployment:**
   - Check container status via `docker compose ps`
   - Wait for backend to be "Up" (30 iterations × 2 seconds = 60s max)
   - Display recent logs (50 lines)
6. **Deployment Status:** Success/failure messages

#### Job 2: `notify`
**Depends on:** `deploy` job
**Condition:** Always runs (even if deploy fails)

**Steps:**
- Success notification: Logs commit SHA, deployer, branch
- Failure notification: Logs error details

### SSH Authentication Flow

**GitHub Actions → Hetzner Server:**
1. GitHub workflow connects as `root` using `SSH_PRIVATE_KEY`
2. Root has passwordless SSH configured via authorized_keys
3. Root executes commands as `porraza` using `sudo -u porraza`
4. `porraza` user has Docker group permissions (no sudo needed for Docker)

**Why this approach:**
- `root` SSH key is already configured and secure
- Avoids needing separate SSH key for `porraza` user
- `root` can sudo to any user without password
- `porraza` user has necessary Docker permissions via group membership

**Important:** The `SERVER_USER` secret in GitHub must be `root`, not `porraza`.

### Docker Configuration

**Docker Compose File:** [docker-compose.yml](docker-compose.yml)
**Version:** 3.8
**Network:** `porraza_network` (bridge driver)

#### Services:

**1. PostgreSQL Service:**
```yaml
container_name: porraza_postgres
image: postgres:18-alpine
restart: unless-stopped
ports: 5432:5432
environment:
  - POSTGRES_DB: ${DB_NAME:-porraza_db}
  - POSTGRES_USER: ${DB_USER:-root}
  - POSTGRES_PASSWORD: ${DB_PASSWORD:-root}
  - POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
  - TZ: Europe/Madrid
volumes:
  - postgres_data:/var/lib/postgresql/data
healthcheck:
  - test: pg_isready -U ${DB_USER} -d ${DB_NAME}
  - interval: 10s, timeout: 5s, retries: 5
```

**2. Backend Service:**
```yaml
container_name: porraza_backend
build: . (uses Dockerfile)
restart: unless-stopped
ports: 3001:3001
depends_on:
  - postgres: service_healthy
environment:
  - NODE_ENV: production
  - PORT: 3001
  - DB_HOST: postgres (container name)
  - DB_PORT: 5432
  - DB_NAME: ${DB_NAME}
  - DB_USER: ${DB_USER}
  - DB_PASSWORD: ${DB_PASSWORD}
healthcheck:
  - test: Node.js HTTP request to localhost:3001
  - interval: 30s, timeout: 10s, retries: 3, start_period: 40s
```

**3. Nginx Service (Optional):**
```yaml
container_name: porraza_nginx
image: nginx:alpine
ports: 80:80, 443:443
profiles: [with-nginx]  # Not enabled by default
```

**Volumes:**
- `postgres_data`: Persistent PostgreSQL data

### Dockerfile (Multi-stage Build)

**Stage 1: Builder**
- Base image: `node:22-alpine`
- Installs `pnpm` globally
- Copies `package.json` and `pnpm-lock.yaml`
- Runs `pnpm install --frozen-lockfile`
- Copies source code
- Builds application (`pnpm run build`)
- Prunes dev dependencies (`pnpm prune --prod`)

**Stage 2: Production**
- Base image: `node:22-alpine`
- Installs `pnpm` globally
- Copies from builder: `dist/`, `node_modules/`, `package.json`
- Creates non-root user `nestjs:nodejs` (UID 1001, GID 1001)
- Changes ownership to `nestjs:nodejs`
- Switches to `nestjs` user
- Exposes port 3001
- Health check: HTTP GET to `http://localhost:3001`
- Command: `node dist/main.js`

**Build Optimization:**
- Multi-stage build reduces final image size
- Production image only includes compiled code and production dependencies
- No source files or dev dependencies in final image
- Security: Runs as non-root user

### Environment Variables

**Required in `.env` file on server:**
```bash
# Database Configuration
DB_HOST=postgres              # Container name (set by docker-compose)
DB_PORT=5432                  # PostgreSQL port
DB_NAME=porraza_db           # Database name
DB_USER=root                 # Database user
DB_PASSWORD=<secure-password> # ⚠️ MUST be changed from default 'root'

# Application Configuration
NODE_ENV=production          # Environment mode
PORT=3001                    # Application port

# JWT & Authentication (to be added)
JWT_SECRET=<secret>          # JWT signing secret
JWT_EXPIRES_IN=7d            # Token expiration

# Email Service (to be added)
EMAIL_HOST=<smtp-host>       # SMTP server
EMAIL_PORT=<smtp-port>       # SMTP port
EMAIL_USER=<email-user>      # SMTP username
EMAIL_PASSWORD=<email-pass>  # SMTP password
```

**Environment File Management:**
- `.env.example`: Template with placeholder values (committed to repo)
- `.env`: Actual production values (NOT committed, listed in `.gitignore`)
- `deploy-local.sh` checks for `.env` and creates from `.env.example` if missing
- **Security:** Never commit `.env` to version control

### Deployment Process

#### Manual Deployment on Server

```bash
# 1. SSH to server as root
ssh root@<server-ip>

# 2. Switch to porraza user
sudo su - porraza

# 3. Navigate to project directory
cd ~/porraza-backend

# 4. Run deployment script
./deploy-local.sh

# 5. Verify deployment
./verify-deployment.sh
```

#### Automated Deployment via GitHub Actions

```bash
# 1. Make changes locally
git add .
git commit -m "Your changes"

# 2. Push to main branch
git push origin main

# 3. GitHub Actions automatically:
#    - Connects to server via SSH
#    - Pulls latest code
#    - Builds Docker image
#    - Deploys containers
#    - Verifies health

# 4. Monitor workflow
# Go to GitHub → Actions tab
# Click on latest workflow run
```

#### Manual Trigger via GitHub UI

1. Go to repository on GitHub
2. Navigate to **Actions** tab
3. Select **Deploy to Hetzner** workflow
4. Click **Run workflow** button
5. Select branch (usually `main`)
6. Click **Run workflow**

### Common Deployment Tasks

**View Container Status:**
```bash
cd ~/porraza-backend
docker compose ps
```

**View Logs:**
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Last 50 lines
docker compose logs --tail=50 backend
```

**Restart Services:**
```bash
# Restart backend only
docker compose restart backend

# Restart all services
docker compose restart

# Stop all services
docker compose down

# Start all services
docker compose up -d
```

**Rebuild and Redeploy:**
```bash
# Quick redeploy (uses cache)
docker compose up -d --build

# Full rebuild (no cache)
docker compose build --no-cache backend
docker compose up -d
```

**Access PostgreSQL:**
```bash
# Via Docker exec
docker exec -it porraza_postgres psql -U root -d porraza_db

# Via psql client (if installed on host)
psql -h localhost -p 5432 -U root -d porraza_db
```

**Check Resource Usage:**
```bash
docker stats porraza_backend porraza_postgres
```

**Clean Up Old Images:**
```bash
docker image prune -f
docker volume prune -f  # ⚠️ Only if you want to delete unused volumes
```

### Troubleshooting

#### Deployment Fails in GitHub Actions

**Problem:** Workflow shows "Permission denied" or "No such file or directory"

**Solutions:**
1. **Check SERVER_USER secret:** Must be `root`, not `porraza`
2. **Verify SSH key:** `SSH_PRIVATE_KEY` must match root's authorized_keys
3. **Check project directory:** Must exist at `/home/porraza/porraza-backend`
4. **Verify porraza user exists:** `id porraza` should return user details

#### Container Fails to Start

**Problem:** Backend container exits immediately or fails health check

**Solutions:**
```bash
# Check container logs
docker compose logs backend

# Common issues:
# 1. Database connection failure (wrong credentials in .env)
# 2. Missing environment variables
# 3. Port already in use (check with: lsof -i :3001)
# 4. Application crash on startup

# Restart with fresh build
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

#### Database Connection Issues

**Problem:** Backend can't connect to PostgreSQL

**Solutions:**
1. **Check PostgreSQL is running:** `docker compose ps | grep postgres`
2. **Verify DB credentials in .env match docker-compose.yml**
3. **Check network connectivity:**
   ```bash
   docker exec porraza_backend ping postgres
   docker exec porraza_postgres pg_isready -U root
   ```
4. **Inspect PostgreSQL logs:** `docker compose logs postgres`

#### Health Check Timeout

**Problem:** Container starts but never becomes "healthy"

**Solutions:**
```bash
# Check what health check is testing
docker inspect porraza_backend | grep -A 5 Healthcheck

# Test health endpoint manually
docker exec porraza_backend curl localhost:3001

# Check application logs for startup errors
docker compose logs --tail=100 backend

# Increase start_period if app takes longer to start
# Edit docker-compose.yml: start_period: 60s
```

#### Port Already in Use

**Problem:** "Address already in use" error when starting containers

**Solutions:**
```bash
# Find what's using port 3001
sudo lsof -i :3001
sudo netstat -tulpn | grep 3001

# Kill the process or stop conflicting container
docker stop <container-id>

# Or change port in .env and docker-compose.yml
PORT=3002
```

#### Disk Space Issues

**Problem:** "No space left on device" during build

**Solutions:**
```bash
# Check disk usage
df -h
docker system df

# Clean up Docker resources
docker system prune -a --volumes  # ⚠️ Removes ALL unused data
docker image prune -a             # Remove unused images only
docker volume prune               # Remove unused volumes

# Check largest images
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -h
```

### Security Considerations

**SSH Access:**
- Only `root` has SSH access (key-based authentication)
- Password authentication disabled
- SSH keys stored securely in GitHub Secrets
- `porraza` user has no direct SSH access (accessed via `sudo su - porraza`)

**Docker Security:**
- Backend runs as non-root user (`nestjs`) inside container
- PostgreSQL uses strong password (must change from default `root`)
- Containers run on isolated bridge network
- Only necessary ports exposed (3001, 5432)

**Environment Secrets:**
- `.env` file contains sensitive data (never committed)
- Database credentials stored in `.env` only
- JWT secrets and API keys must be generated and added to `.env`

**Firewall Configuration:**
```bash
# Check firewall status
sudo ufw status

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (if using Nginx)
sudo ufw allow 443/tcp   # HTTPS (if using Nginx)
sudo ufw allow 3001/tcp  # Backend API (only if direct access needed)

# Enable firewall
sudo ufw enable
```

**Recommended Security Improvements:**
1. Change default database password in `.env`
2. Use Nginx reverse proxy (enable `with-nginx` profile)
3. Add SSL/TLS certificates for HTTPS
4. Implement rate limiting in API
5. Set up automated backups for PostgreSQL data
6. Configure log rotation to prevent disk fill
7. Keep server packages updated: `sudo apt update && sudo apt upgrade`

### Monitoring & Maintenance

**Automated Health Checks:**
- Docker Compose health checks run every 30 seconds
- GitHub Actions verifies deployment after each push
- Health endpoint: `http://<server-ip>:3001`

**Log Management:**
```bash
# View container logs
docker compose logs -f backend

# Limit log size in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Backup PostgreSQL Data:**
```bash
# Create backup
docker exec porraza_postgres pg_dump -U root -d porraza_db > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20261022.sql | docker exec -i porraza_postgres psql -U root -d porraza_db
```

**Server Restart Behavior:**
- Containers have `restart: unless-stopped` policy
- Automatically restart after server reboot
- To prevent auto-restart: `docker compose down`

### Future Improvements

**Planned Enhancements:**
1. Add Nginx reverse proxy with SSL/TLS
2. Implement database backup automation
3. Add monitoring stack (Prometheus + Grafana)
4. Set up centralized logging (ELK stack or similar)
5. Implement blue-green deployment strategy
6. Add pre-deployment smoke tests in CI/CD
7. Configure CDN for static assets
8. Set up staging environment for testing

**Performance Optimization:**
1. Enable Docker BuildKit for faster builds
2. Implement Redis caching layer
3. Add database connection pooling
4. Configure GZIP compression in Nginx
5. Implement API response caching
