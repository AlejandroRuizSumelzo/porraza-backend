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
