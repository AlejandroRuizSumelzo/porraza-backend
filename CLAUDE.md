# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Project Overview

**Porraza** es una plataforma de predicciones deportivas para torneos de fútbol (FIFA World Cup 2026). Los usuarios predicen resultados de partidos y premios individuales (Pichichi/MVP), compitiendo en ligas públicas/privadas con clasificaciones en tiempo real.

Backend NestJS con TypeScript siguiendo **Clean Architecture** con SQL nativo (PostgreSQL 18).

### Características Principales

- **Autenticación JWT**: Access tokens en cookies HTTP-only, refresh tokens
- **Verificación de Email**: Sistema de verificación mediante token y email de bienvenida
- **Pagos con Stripe**: Embedded Checkout (€1.99) para acceso premium
- **Sistema de Ligas**: Públicas/privadas con códigos de invitación
- **Predicciones**: Fase de grupos y eliminatorias con bloqueo temporal
- **Base de datos**: PostgreSQL 18 con queries SQL directas (sin ORM)

## Stack Tecnológico

- **Runtime**: Node.js 22
- **Framework**: NestJS 11
- **Lenguaje**: TypeScript 5.7
- **Base de datos**: PostgreSQL 18 (driver `pg`)
- **Autenticación**: JWT con Passport
- **Pagos**: Stripe Embedded Checkout
- **Email**: Resend
- **Validación**: class-validator, class-transformer
- **Documentación**: Swagger/OpenAPI
- **Package Manager**: pnpm

## Comandos de Desarrollo

### Instalación

```bash
pnpm install
```

### Desarrollo

```bash
pnpm run start:dev    # Hot-reload
pnpm run start:debug  # Debug mode
pnpm run start        # Standard
```

### Producción

```bash
pnpm run build        # Compilar a dist/
pnpm run start:prod   # Ejecutar compilado
```

### Testing

```bash
pnpm run test         # Unit tests
pnpm run test:watch   # Watch mode
pnpm run test:e2e     # End-to-end
pnpm run test:cov     # Coverage
```

### Code Quality

```bash
pnpm run lint         # ESLint + auto-fix
pnpm run format       # Prettier
```

## Clean Architecture

Este proyecto implementa Clean Architecture con separación estricta de capas y la Regla de Dependencia.

### Estructura de Capas

```
src/
├── domain/                  # Capa 1: Dominio (Innermost)
│   ├── entities/            # Entidades puras de negocio
│   └── repositories/        # Interfaces (Ports)
├── application/             # Capa 2: Aplicación
│   └── use-cases/           # Casos de uso (Interactors)
├── infrastructure/          # Capa 3: Infraestructura
│   ├── auth/                # JWT, Passport strategies, cookies
│   ├── config/              # Configuraciones (database, etc.)
│   ├── email/               # Servicio de email (Resend)
│   ├── persistence/         # Implementaciones de repositorios
│   │   ├── database.module.ts
│   │   └── repositories/    # Repositorios concretos (SQL)
│   └── stripe/              # Servicio de pagos (Stripe)
├── adapters/                # Capa 4: Adaptadores
│   ├── controllers/         # REST Controllers
│   ├── dtos/                # Data Transfer Objects
│   └── guards/              # Guards de autenticación
├── modules/                 # Módulos NestJS (DI)
│   ├── auth/
│   ├── email/
│   ├── league/
│   ├── match/
│   ├── payment/
│   ├── stadium/
│   ├── team/
│   └── user/
├── app.module.ts            # Módulo raíz
└── main.ts                  # Bootstrap
```

### Regla de Dependencia

**Las dependencias apuntan hacia adentro (hacia el dominio).**

```
Infrastructure → Adapters → Application → Domain
                                          ↑
                                    (No depende de nadie)
```

**Principios:**

- Domain NO depende de ninguna capa externa
- Application depende solo de Domain
- Infrastructure implementa interfaces definidas en Domain
- Adapters transforman datos entre capas

### Capa 1: Domain (Dominio)

**Localización**: `src/domain/`

Núcleo del negocio, independiente de frameworks y librerías.

#### Entidades (`domain/entities/`)

Clases inmutables con reglas de negocio y validaciones.

**Características:**

- Propiedades `readonly`
- Validaciones en constructor
- Sin decoradores de ORM/NestJS
- Factory method `fromDatabase()` para mapping
- Métodos de negocio puros

**Entidades del Sistema:**

```typescript
// User - Sistema de usuarios
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly isEmailVerified: boolean,
    public readonly hasPaid: boolean,
    public readonly paymentDate: Date | null,
    public readonly stripeCustomerId: string | null,
    // ... más campos
  ) {
    this.validate();
  }

  canLogin(): boolean {
    return this.isActive && this.isEmailVerified;
  }
  hasCompletedPayment(): boolean {
    return this.hasPaid;
  }
}

// League - Sistema de ligas
export class League {
  // type: 'public' | 'private'
  // inviteCode: solo para ligas privadas
  isAdmin(userId: string): boolean {
    /* ... */
  }
  requiresInviteCode(): boolean {
    /* ... */
  }
}

// Match - Partidos del torneo
export class Match {
  // phase: GROUP_STAGE | ROUND_OF_32 | ROUND_OF_16 | ...
  // TBD teams para eliminatorias
  arePredictionsLocked(): boolean {
    /* ... */
  }
  isGroupStage(): boolean {
    /* ... */
  }
}

// Team - Equipos nacionales (48 reales + 64 TBD)
export class Team {
  /* ... */
}

// Stadium - Estadios (16 venues)
export class Stadium {
  /* ... */
}
```

#### Repositorios (`domain/repositories/`)

Interfaces (Ports) que definen contratos para persistencia.

**Patrón**: Dependency Inversion Principle (DIP)

```typescript
// Interface en Domain (Port)
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  updatePaymentStatus(
    userId: string,
    params: UpdatePaymentStatusParams,
  ): Promise<void>;
}

// Implementación en Infrastructure (Adapter)
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    return result.rows[0] ? User.fromDatabase(result.rows[0]) : null;
  }
  // ...
}
```

**Repositorios del Sistema:**

- `IUserRepository` - CRUD usuarios + autenticación
- `ILeagueRepository` - CRUD ligas + membresías
- `IMatchRepository` - Consulta partidos
- `ITeamRepository` - Consulta equipos
- `IStadiumRepository` - Consulta estadios
- `IPaymentRepository` - Integración Stripe
- `IEmailRepository` - Envío de emails
- `IJwtRepository` - Generación/validación tokens

### Capa 2: Application (Casos de Uso)

**Localización**: `src/application/use-cases/`

Lógica de aplicación que orquesta entidades y repositorios.

#### Use Cases

Cada caso de uso representa una operación de negocio específica.

**Estructura típica:**

```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(createUserDto: CreateUserDto): Promise<User> {
    // 1. Validar reglas de negocio
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Ejecutar operación
    const user = await this.userRepository.create(createUserDto);

    // 3. Retornar resultado
    return user;
  }
}
```

**Casos de Uso por Módulo:**

**Auth (7 use cases):**

- `login.use-case.ts` - Autenticación JWT
- `register.use-case.ts` - Registro + envío email verificación
- `refresh-token.use-case.ts` - Renovación access token
- `verify-email.use-case.ts` - Verificación email + welcome email
- `resend-verification.use-case.ts` - Reenvío email verificación
- `request-password-reset.use-case.ts` - Solicitud reset password
- `reset-password.use-case.ts` - Reset password con token

**Users (7 use cases):**

- `create-user.use-case.ts`
- `get-user-by-id.use-case.ts`
- `get-user-by-email.use-case.ts`
- `get-all-users.use-case.ts`
- `update-user.use-case.ts`
- `update-password.use-case.ts`
- `delete-user.use-case.ts`

**Leagues (12 use cases):**

- `create-league.use-case.ts`
- `get-all-leagues.use-case.ts`
- `get-public-leagues.use-case.ts`
- `get-user-leagues.use-case.ts`
- `get-league-by-id.use-case.ts`
- `update-league.use-case.ts`
- `delete-league.use-case.ts`
- `join-league.use-case.ts`
- `leave-league.use-case.ts`
- `get-league-members.use-case.ts`
- `remove-member.use-case.ts`
- `transfer-admin.use-case.ts`

**Matches (3 use cases):**

- `get-all-matches.use-case.ts`
- `get-match-by-id.use-case.ts`
- `get-match-calendar.use-case.ts`

**Payments (4 use cases):**

- `create-checkout-session.use-case.ts`
- `verify-payment-status.use-case.ts`
- `get-session-status.use-case.ts`
- `handle-stripe-webhook.use-case.ts`

**Teams (2 use cases):**

- `get-all-teams.use-case.ts`
- `get-team-by-id.use-case.ts`

**Stadiums (1 use case):**

- `get-all-stadiums.use-case.ts`

### Capa 3: Infrastructure (Infraestructura)

**Localización**: `src/infrastructure/`

Implementaciones concretas de servicios externos y frameworks.

#### Autenticación (`infrastructure/auth/`)

**JWT Strategy:**

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.canLogin()) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

**Cookies:**

- `accessToken` - HTTP-only, Secure, SameSite=Strict (7 días)
- `refreshToken` - HTTP-only, Secure, SameSite=Strict (30 días)

#### Base de Datos (`infrastructure/persistence/`)

**Database Module:**

```typescript
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: () => new Pool(databaseConfig),
    },
  ],
  exports: ['DATABASE_POOL'],
})
export class DatabaseModule {}
```

**Repositorios Concretos (`persistence/repositories/`):**

- `user.repository.ts` - SQL + bcrypt (hash passwords)
- `league.repository.ts` - SQL con joins para membresías
- `match.repository.ts` - SQL con joins a teams/stadiums/groups
- `team.repository.ts` - SQL con filtros por confederación
- `stadium.repository.ts` - SQL con timezone handling

#### Email (`infrastructure/email/`)

**Resend Email Service:**

```typescript
@Injectable()
export class ResendEmailService implements IEmailRepository {
  private resend: Resend;

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Porraza <noreply@porraza.com>',
      to,
      subject: 'Verifica tu email',
      html: VerificationEmailTemplate.render(token),
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    /* ... */
  }
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    /* ... */
  }
  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    /* ... */
  }
}
```

**Templates (`email/templates/`):**

- `verification-email.template.ts`
- `welcome-email.template.ts`
- `password-reset-email.template.ts`
- `password-changed-email.template.ts`

#### Stripe (`infrastructure/stripe/`)

```typescript
@Injectable()
export class StripePaymentService implements IPaymentRepository {
  private stripe: Stripe;

  async createCheckoutSession(userId: string): Promise<CheckoutSession> {
    return await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`,
      metadata: { userId },
    });
  }

  async verifyWebhookSignature(
    payload: Buffer,
    signature: string,
  ): Promise<Event> {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  }
}
```

### Capa 4: Adapters (Adaptadores)

**Localización**: `src/adapters/`

Transformación de datos entre capas externas e internas.

#### Controllers (`adapters/controllers/`)

Manejan peticiones HTTP y delegan a Use Cases.

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(createUserDto);
    return UserResponseDto.fromEntity(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.getUserByIdUseCase.execute(id);
    return UserResponseDto.fromEntity(user);
  }
}
```

**Controllers del Sistema:**

- `auth.controller.ts` - Login, register, refresh, verify email, reset password
- `user.controller.ts` - CRUD usuarios
- `league.controller.ts` - CRUD ligas + join/leave/members
- `match.controller.ts` - Consulta partidos + calendario
- `payment.controller.ts` - Checkout Stripe + webhooks
- `team.controller.ts` - Consulta equipos
- `stadium.controller.ts` - Consulta estadios

#### DTOs (`adapters/dtos/`)

Validación y transformación de datos HTTP.

```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @MinLength(2)
  @MaxLength(150)
  name: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isEmailVerified: boolean;
  hasPaid: boolean;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.isActive = user.isActive;
    dto.isEmailVerified = user.isEmailVerified;
    dto.hasPaid = user.hasPaid;
    return dto;
  }
}
```

**DTOs por Módulo:**

- `auth/` - Login, register, tokens, verify email, reset password
- `user/` - Create, update, update password, response
- `league/` - Create, update, join, transfer admin, response
- `payment/` - Checkout session, payment status, session status
- `match.response.dto.ts`
- `match-calendar.response.dto.ts`
- `team.response.dto.ts`
- `stadium-response.dto.ts`

#### Guards (`adapters/guards/`)

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Protege rutas con JWT
}
```

### Módulos NestJS (Dependency Injection)

**Localización**: `src/modules/`

Módulos que conectan todas las capas mediante DI.

#### Patrón de Inyección de Dependencias

```typescript
@Module({
  imports: [
    DatabaseModule, // Proporciona DATABASE_POOL
    EmailModule, // Proporciona IEmailRepository
  ],
  controllers: [
    UserController, // Maneja HTTP requests
  ],
  providers: [
    // Use Cases
    CreateUserUseCase,
    GetUserByIdUseCase,
    // ... más use cases

    // Repository (Inversión de Dependencias)
    {
      provide: 'IUserRepository', // Token (interface name)
      useClass: UserRepository, // Implementación concreta
    },
  ],
  exports: [
    'IUserRepository', // Exportar para otros módulos
    GetUserByIdUseCase,
  ],
})
export class UserModule {}
```

**Flujo de Inyección:**

```
DatabaseModule.DATABASE_POOL
    ↓
UserRepository (implementa IUserRepository)
    ↓
CreateUserUseCase (@Inject('IUserRepository'))
    ↓
UserController (inyecta CreateUserUseCase)
```

**Ventajas:**

- **Inversión de dependencias**: Use Cases dependen de abstracciones
- **Testing**: Fácil mock de repositorios con tokens
- **Cambio de implementación**: Solo cambiar `useClass`
- **Desacoplamiento**: Capas no conocen implementaciones

**Módulos del Sistema:**

- `auth.module.ts` - JWT, Passport, Auth use cases
- `user.module.ts` - User use cases + repository
- `league.module.ts` - League use cases + repository
- `match.module.ts` - Match use cases + repository
- `payment.module.ts` - Stripe use cases + service
- `team.module.ts` - Team use cases + repository
- `stadium.module.ts` - Stadium use cases + repository
- `email.module.ts` - Resend service global

## Base de Datos

### Tecnología

- **Motor**: PostgreSQL 18 Alpine
- **Driver**: `pg` (Node PostgreSQL driver)
- **Approach**: SQL queries directo (sin ORM)
- **Connection**: Pool de conexiones

### Esquema de Tablas

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ NULL,
  has_paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMPTZ NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_session_id VARCHAR(255) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT users_name_check CHECK (LENGTH(name) >= 2)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
```

#### leagues

```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('public', 'private')),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 200,
  invite_code VARCHAR(20) UNIQUE NULL,
  logo_url VARCHAR(500) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leagues_name_check CHECK (LENGTH(name) >= 3)
);
```

#### teams

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  fifa_code VARCHAR(3) UNIQUE NOT NULL,  -- ARG, BRA, TBD01-TBD64
  confederation VARCHAR(10) NOT NULL,     -- UEFA, CONMEBOL, TBD
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 48 equipos reales + 64 TBD placeholders
```

#### stadiums

```sql
CREATE TABLE stadiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,       -- MEX_CDMX_AZTECA
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(3) NOT NULL,            -- MEX, USA, CAN
  timezone VARCHAR(50) NOT NULL,          -- America/Mexico_City
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 16 estadios
```

#### groups

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name CHAR(1) UNIQUE NOT NULL CHECK (name >= 'A' AND name <= 'L'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 12 grupos (A-L)
```

#### matches

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number INTEGER UNIQUE NOT NULL CHECK (match_number >= 1 AND match_number <= 104),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_team_placeholder VARCHAR(150) NULL,  -- "Group A winners"
  away_team_placeholder VARCHAR(150) NULL,
  stadium_id UUID NOT NULL REFERENCES stadiums(id),
  group_id UUID NULL REFERENCES groups(id),
  phase VARCHAR(20) NOT NULL,  -- GROUP_STAGE, ROUND_OF_32, etc.
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '20:00:00',
  home_score INTEGER NULL,
  away_score INTEGER NULL,
  home_score_et INTEGER NULL,
  away_score_et INTEGER NULL,
  home_penalties INTEGER NULL,
  away_penalties INTEGER NULL,
  status VARCHAR(20) DEFAULT 'SCHEDULED',  -- SCHEDULED, LIVE, FINISHED
  predictions_locked_at TIMESTAMPTZ NOT NULL,
  depends_on_match_ids INTEGER[] NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 104 partidos totales
```

### Triggers

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Similar para otras tablas
```

### Diseño de Datos

**Decisiones clave:**

1. **UUIDs**: Seguridad y escalabilidad distribuida
2. **Equipos TBD**: Placeholders como entidades reales (simplifica queries)
3. **Deadline global**: Predicciones se bloquean 1h antes del torneo
4. **snake_case en BD**: Mapping a camelCase en entidades TypeScript
5. **TIMESTAMPTZ**: Soporte multi-timezone (3 países)
6. **Arrays nativos**: `depends_on_match_ids` evita tabla junction

## Autenticación y Seguridad

### JWT con Cookies

**Tokens:**

- **Access Token**: 7 días, cookie HTTP-only
- **Refresh Token**: 30 días, cookie HTTP-only

**Configuración cookies:**

```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
}
```

**Flujo de autenticación:**

1. Login → Genera access + refresh tokens → Set cookies
2. Request protegido → JwtAuthGuard valida token → Extrae usuario
3. Token expirado → Refresh endpoint → Nuevo access token
4. Logout → Clear cookies

### Protección de Rutas

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get('profile')
  getProfile(@Req() req) {
    return req.user; // Usuario inyectado por JwtStrategy
  }
}
```

### Verificación de Email

**Flujo:**

1. Register → Email con token de verificación
2. Usuario click link → `POST /auth/verify-email`
3. Token válido → `email_verified = TRUE` + Welcome email
4. Login solo permitido si `email_verified = TRUE`

### Password Hashing

```typescript
// En UserRepository
const passwordHash = await bcrypt.hash(password, 10);
```

## Pagos con Stripe

### Configuración

```bash
# .env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx  # €1.99 product
```

### Flujo de Pago

1. **Usuario solicita checkout:**

   ```
   POST /payments/create-checkout-session
   → Crea Stripe session con metadata: {userId}
   → Retorna {clientSecret, sessionId}
   ```

2. **Frontend muestra Embedded Checkout:**

   ```javascript
   <EmbeddedCheckout clientSecret={clientSecret} />
   ```

3. **Stripe webhook confirma pago:**

   ```
   POST /payments/webhook
   → Valida firma Stripe
   → Extrae userId de metadata
   → UPDATE users SET has_paid=TRUE, payment_date=NOW()
   ```

4. **Usuario accede a features premium:**
   ```
   GET /payments/verify-status
   → {hasPaid: true, paymentDate: "2025-10-24..."}
   ```

### Testing Pagos

**Test cards:**

- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`

**Webhook local:**

```bash
stripe listen --forward-to http://localhost:3001/payments/webhook
```

## API Documentation (Swagger)

### Acceso

```
http://localhost:3001/api
```

### Configuración

```typescript
const config = new DocumentBuilder()
  .setTitle('Porraza API')
  .setDescription('API documentation')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'JWT-auth',
  )
  .addCookieAuth('accessToken', {}, 'cookie-auth')
  .build();
```

### Decoradores en Controllers

```typescript
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 201,
    description: 'User created',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    /* ... */
  }
}
```

## Variables de Entorno

### Requeridas

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=porraza_db
DB_USER=root
DB_PASSWORD=secure_password

# Application
NODE_ENV=development
PORT=3001

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID=price_xxxxx

# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@porraza.com

# Frontend
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Deployment

### Docker

**Producción**: Hetzner Cloud con Docker Compose

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: porraza_postgres

  backend:
    build: .
    container_name: porraza_backend
    depends_on:
      postgres:
        condition: service_healthy
```

**Dockerfile multi-stage:**

```dockerfile
# Stage 1: Builder
FROM node:22-alpine AS builder
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine
RUN npm install -g pnpm
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER nestjs:nodejs
CMD ["node", "dist/main.js"]
```

### CI/CD

**GitHub Actions**: Deploy automático en push a `main`

```yaml
# .github/workflows/deploy.yml
- name: Deploy
  run: |
    ssh root@$SERVER_HOST "
      cd ~/porraza-backend
      ./deploy-local.sh
    "
```

**Scripts:**

- `deploy-local.sh` - Deploy principal (pull + build + up)
- `verify-deployment.sh` - Health checks post-deploy

## Testing Strategy

### Unit Tests

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;

    useCase = new CreateUserUseCase(mockUserRepository);
  });

  it('should create user when email is available', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(mockUser);

    const result = await useCase.execute(createUserDto);

    expect(result).toBe(mockUser);
    expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
  });
});
```

### E2E Tests

```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

## Convenciones de Código

### Naming

- **Entidades**: PascalCase (`User`, `League`)
- **Interfaces**: I prefix (`IUserRepository`)
- **DTOs**: Suffix `.dto.ts` (`CreateUserDto`)
- **Use Cases**: Suffix `.use-case.ts` (`CreateUserUseCase`)
- **Controllers**: Suffix `.controller.ts` (`UserController`)
- **Modules**: Suffix `.module.ts` (`UserModule`)

### File Organization

```
feature/
├── feature.entity.ts           # Domain
├── feature.repository.interface.ts
├── feature.repository.ts       # Infrastructure
├── feature.controller.ts       # Adapters
├── feature.module.ts           # Module
├── dtos/
│   ├── create-feature.dto.ts
│   └── feature-response.dto.ts
└── use-cases/
    ├── create-feature.use-case.ts
    └── get-feature.use-case.ts
```

### TypeScript

```typescript
// Usar tipos explícitos
async findById(id: string): Promise<User | null> { /* ... */ }

// Readonly para inmutabilidad
constructor(public readonly id: string) {}

// Interface para contracts
export interface IUserRepository { /* ... */ }

// Type para DTOs
export type CreateUserData = { /* ... */ };
```

## Recursos Adicionales

- **NestJS Docs**: https://docs.nestjs.com
- **Clean Architecture**: "Clean Architecture" by Robert C. Martin
- **PostgreSQL 18**: https://www.postgresql.org/docs/18/
- **Stripe Embedded Checkout**: https://docs.stripe.com/checkout/embedded
- **Resend API**: https://resend.com/docs

## Sistema de Predicciones (Core Business)

**Núcleo principal de Porraza**: Los usuarios predicen resultados del Mundial 2026, compitiendo en ligas con sistema de puntuación en tiempo real.

### Arquitectura del Sistema

```
User → League (1:N) → Prediction (1:1 por user-league)
                         ├── Match Predictions (partidos)
                         ├── Group Standings (tablas de grupo)
                         ├── Best Third Places (mejores terceros)
                         ├── Awards (Golden Boot/Ball/Glove)
                         └── Champion (campeón predicho)
```

### Reglas de Negocio Clave

**1. Una predicción por usuario por liga**
- Usuario puede estar en múltiples ligas
- Cada liga tiene una predicción independiente
- Constraint: `UNIQUE (user_id, league_id)` en tabla `predictions`

**2. Deadline global**
- Las predicciones se bloquean **1 hora antes del primer partido** (partido inaugural)
- Fecha: 11 junio 2026, 19:00 (1h antes del kickoff a las 20:00)
- Campo: `predictions.is_locked = TRUE`, `predictions.locked_at`
- No se pueden editar predicciones después del deadline

**3. Flujo de predicción**
```
1. Usuario predice FASE DE GRUPOS (grupos A-L)
   → Backend calcula automáticamente tabla de posiciones por grupo
   → Backend calcula los 8 mejores terceros
   → Frontend habilita fase eliminatorias

2. Usuario predice ELIMINATORIAS (R32 → R16 → QF → SF → Final)
   → Backend valida que equipos coincidan con clasificados predichos
   → Usuario predice resultado 90', prórroga, penaltis

3. Usuario selecciona PREMIOS INDIVIDUALES
   → Golden Boot (máximo goleador)
   → Golden Ball (mejor jugador)
   → Golden Glove (mejor portero)

4. Usuario selecciona CAMPEÓN

5. Predicción completa → Esperando resultados reales
```

**4. Cálculo de tablas de grupo (FIFA World Cup 2026)**

Mundial 2026 tiene **12 grupos de 4 equipos** (48 equipos totales).

**Clasifican a Round of 32:**
- 1º y 2º de cada grupo (24 equipos)
- Los 8 mejores terceros lugares (8 equipos)
- **Total**: 32 equipos pasan a eliminatorias

**Criterios de desempate FIFA (simplificados para v1):**

En cada grupo, los equipos se ordenan por:
1. **Puntos** (Victoria 3, Empate 1, Derrota 0)
2. **Diferencia de goles** (GF - GC)
3. **Goles a favor** (GF)
4. ⚠️ **Si empate total**: Backend marca `has_tiebreak_conflict = TRUE`, usuario puede ordenar manualmente

Para los **mejores terceros**, se crea tabla general con los 12 terceros y se ordenan por:
1. Puntos
2. Diferencia de goles
3. Goles a favor
4. ⚠️ Si empate total: Backend marca conflicto, usuario ordena manualmente

**Nota**: En v1 NO implementamos tarjetas (fair play) ni FIFA ranking. Estos criterios se añadirán en v2.

### Base de Datos - Predicciones

#### players

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position VARCHAR(20) NOT NULL CHECK (position IN ('goalkeeper', 'defender', 'midfielder', 'forward')),
  jersey_number INTEGER CHECK (jersey_number >= 1 AND jersey_number <= 99),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- **48 equipos × 23 jugadores = 1,104 jugadores**
- Seed automático con nombres placeholder (ej: "ARG Goalkeeper 1")
- Admin actualiza nombres reales después del sorteo
- `position` determina elegibilidad para premios (goalkeepers → Golden Glove)

#### predictions

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Premios individuales
  golden_boot_player_id UUID NULL REFERENCES players(id),
  golden_ball_player_id UUID NULL REFERENCES players(id),
  golden_glove_player_id UUID NULL REFERENCES players(id),

  -- Campeón
  champion_team_id UUID NULL REFERENCES teams(id),

  -- Estado de completitud
  groups_completed BOOLEAN DEFAULT FALSE,
  knockouts_completed BOOLEAN DEFAULT FALSE,
  awards_completed BOOLEAN DEFAULT FALSE,

  -- Control de deadline
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ NULL,

  -- Puntuación acumulada (cache)
  total_points INTEGER DEFAULT 0,
  last_points_calculation TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT predictions_user_league_unique UNIQUE (user_id, league_id)
);
```

**Estados de predicción:**
- `draft` - Recién creada, sin predicciones
- `in_progress` - Algunos grupos completados
- `complete` - Grupos + eliminatorias + premios + campeón
- `locked_incomplete` - Deadline pasó, no completó todo
- `locked_complete` - Deadline pasó, predicción completa

#### match_predictions

```sql
CREATE TABLE match_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Predicción del resultado (90 minutos)
  home_score INTEGER NOT NULL CHECK (home_score >= 0),
  away_score INTEGER NOT NULL CHECK (away_score >= 0),

  -- Para eliminatorias (nullable)
  home_score_et INTEGER NULL CHECK (home_score_et >= 0),
  away_score_et INTEGER NULL CHECK (away_score_et >= 0),
  penalties_winner VARCHAR(4) NULL CHECK (penalties_winner IN ('home', 'away')),

  -- Puntos obtenidos (calculado después del partido real)
  points_earned INTEGER DEFAULT 0,
  points_breakdown JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT match_predictions_unique UNIQUE (prediction_id, match_id)
);
```

**Reglas de validación:**
- `home_score_et` y `away_score_et` solo si `home_score == away_score` (empate en 90')
- `penalties_winner` solo si empate después de prórroga
- `points_breakdown` almacena detalle: `{ exactResult: 3, correct1X2: 1, phaseBonus: 5 }`

#### group_standings_predictions

```sql
CREATE TABLE group_standings_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Posición predicha (1-4)
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),

  -- Estadísticas calculadas automáticamente por backend
  points INTEGER DEFAULT 0,
  played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,

  -- FLAGS DE DESEMPATE
  has_tiebreak_conflict BOOLEAN DEFAULT FALSE,
  tiebreak_group INTEGER NULL,  -- Agrupa equipos empatados (1, 2, 3...)
  manual_tiebreak_order INTEGER NULL,  -- Orden manual del usuario (1, 2, 3, 4)

  -- Puntos obtenidos si acertó la posición
  points_earned INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT group_standings_predictions_unique UNIQUE (prediction_id, group_id, team_id),
  CONSTRAINT group_standings_predictions_position_unique UNIQUE (prediction_id, group_id, position)
);
```

**Cálculo automático:**
- Backend recibe `match_predictions` de un grupo
- Calcula tabla de posiciones según reglas FIFA
- Si detecta empate total (puntos, DG, GF): marca `has_tiebreak_conflict = TRUE`
- Frontend muestra mensaje: "⚠️ España y Argentina están empatados. ¿Ajustar orden?"
- Usuario puede arrastrar equipos para ordenar manualmente
- Backend actualiza `manual_tiebreak_order` (1 = primero, 2 = segundo, etc.)

#### best_third_places_predictions

```sql
CREATE TABLE best_third_places_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Ranking de mejores terceros (1-8)
  ranking_position INTEGER NOT NULL CHECK (ranking_position >= 1 AND ranking_position <= 8),

  -- Estadísticas (copiadas de group_standings_predictions)
  points INTEGER NOT NULL,
  goal_difference INTEGER NOT NULL,
  goals_for INTEGER NOT NULL,
  from_group_id UUID NOT NULL REFERENCES groups(id),

  -- Flag de desempate (mismo concepto que group_standings)
  has_tiebreak_conflict BOOLEAN DEFAULT FALSE,
  tiebreak_group INTEGER NULL,
  manual_tiebreak_order INTEGER NULL,

  -- Puntos obtenidos si acertó que este equipo clasifica
  points_earned INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT best_third_places_predictions_unique UNIQUE (prediction_id, team_id),
  CONSTRAINT best_third_places_predictions_ranking_unique UNIQUE (prediction_id, ranking_position)
);
```

**Cálculo automático:**
- Backend detecta que los 12 grupos están completos
- Extrae los 12 terceros de `group_standings_predictions`
- Ordena por: puntos → DG → GF
- Toma los 8 primeros
- Si hay empates totales: marca `has_tiebreak_conflict = TRUE`
- Guarda en esta tabla los 8 mejores terceros

#### group_standings_actual & best_third_places_actual

```sql
-- Tabla de posiciones REALES de cada grupo
CREATE TABLE group_standings_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 4),
  points INTEGER NOT NULL,
  played INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  draws INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  goals_for INTEGER NOT NULL,
  goals_against INTEGER NOT NULL,
  goal_difference INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT group_standings_actual_unique UNIQUE (group_id, team_id),
  CONSTRAINT group_standings_actual_position_unique UNIQUE (group_id, position)
);

-- Los 8 mejores terceros REALES
CREATE TABLE best_third_places_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  ranking_position INTEGER NOT NULL CHECK (ranking_position >= 1 AND ranking_position <= 8),
  points INTEGER NOT NULL,
  goal_difference INTEGER NOT NULL,
  goals_for INTEGER NOT NULL,
  from_group_id UUID NOT NULL REFERENCES groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT best_third_places_actual_unique UNIQUE (team_id),
  CONSTRAINT best_third_places_actual_ranking_unique UNIQUE (ranking_position)
);
```

**Uso:**
- El admin actualiza estas tablas manualmente cuando finaliza cada grupo
- Backend usa estas tablas para calcular puntos:
  - Compara `group_standings_predictions` vs `group_standings_actual`
  - Compara `best_third_places_predictions` vs `best_third_places_actual`
  - Actualiza `points_earned` en cada registro

### Sistema de Puntuación

```typescript
export const POINTS_SYSTEM = {
  // FASE DE GRUPOS
  GROUP_EXACT_RESULT: 3,           // Resultado exacto (2-1)
  GROUP_CORRECT_1X2: 1,            // Acierto en victoria/empate/derrota (no marcador)
  GROUP_POSITION_EXACT: 3,         // Posición exacta en grupo (1º o 2º)
  GROUP_POSITION_QUALIFIED: 1,     // Equipo clasificó pero en otra posición

  // ELIMINATORIAS
  KNOCKOUT_EXACT_RESULT_90: 5,     // Resultado exacto en 90'
  KNOCKOUT_CORRECT_WINNER_90: 2,   // Ganador correcto en 90'
  KNOCKOUT_EXACT_RESULT_ET: 8,     // Resultado exacto en prórroga
  KNOCKOUT_CORRECT_WINNER_ET: 3,   // Ganador correcto en prórroga
  KNOCKOUT_CORRECT_PENALTIES: 4,   // Ganador correcto en penaltis

  // PROGRESO EN TORNEO (acumulativo)
  ROUND_OF_32_QUALIFIER: 5,        // Acertó que pasa a R32
  ROUND_OF_16_QUALIFIER: 10,       // Acertó que pasa a R16 (octavos)
  QUARTER_FINALIST: 15,            // Acertó cuartos
  SEMI_FINALIST: 25,               // Acertó semifinales
  FINALIST: 40,                    // Acertó finalista
  CHAMPION: 80,                    // Acertó campeón

  // PREMIOS INDIVIDUALES
  GOLDEN_BOOT: 50,                 // Máximo goleador
  GOLDEN_BALL: 50,                 // Mejor jugador
  GOLDEN_GLOVE: 50,                // Mejor portero
} as const;
```

**Ejemplo de puntuación acumulativa:**
- Usuario predice: Brasil campeón
- Brasil llega a final y gana
- Puntos ganados: 5 (R32) + 10 (R16) + 15 (QF) + 25 (SF) + 40 (Finalist) + 80 (Champion) = **175 puntos**

**Ejemplo fase de grupos:**
- Predicción: España 2-1 Argentina
- Real: España 2-1 Argentina
- Puntos: 3 (resultado exacto) + 1 (acierto 1X2) = **4 puntos**

- Predicción: Brasil 3-0 Ecuador
- Real: Brasil 2-0 Ecuador
- Puntos: 1 (acierto victoria, pero no marcador exacto) = **1 punto**

### Entidades del Dominio - Predicciones

**Nuevas entidades añadidas:**

```typescript
// Player - Jugadores de selecciones (src/domain/entities/player.entity.ts)
export class Player {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly teamId: string,
    public readonly position: PlayerPosition,
    public readonly jerseyNumber: number,
    // ...
  ) {}

  isGoalkeeper(): boolean
  canBeGoldenGlove(): boolean
  getDisplayName(): string  // "#10 Lionel Messi"
}

// Prediction - Predicción principal (src/domain/entities/prediction.entity.ts)
export class Prediction {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly leagueId: string,
    public readonly goldenBootPlayerId: string | null,
    public readonly goldenBallPlayerId: string | null,
    public readonly goldenGlovePlayerId: string | null,
    public readonly championTeamId: string | null,
    public readonly groupsCompleted: boolean,
    public readonly knockoutsCompleted: boolean,
    public readonly awardsCompleted: boolean,
    public readonly isLocked: boolean,
    public readonly totalPoints: number,
    // ...
  ) {}

  canBeEdited(): boolean
  isComplete(): boolean
  getCompletionPercentage(): number  // 0-100
  getStatus(): 'draft' | 'in_progress' | 'complete' | 'locked_incomplete' | 'locked_complete'
}

// MatchPrediction - Predicción de partido (src/domain/entities/match-prediction.entity.ts)
export class MatchPrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly matchId: string,
    public readonly homeScore: number,
    public readonly awayScore: number,
    public readonly homeScoreET: number | null,
    public readonly awayScoreET: number | null,
    public readonly penaltiesWinner: 'home' | 'away' | null,
    public readonly pointsEarned: number,
    public readonly pointsBreakdown: PointsBreakdown,
    // ...
  ) {}

  isDraw(): boolean
  hasExtraTime(): boolean
  hasPenalties(): boolean
  getWinner90(): 'home' | 'away' | 'draw'
  getFinalWinner(): 'home' | 'away' | 'draw'
  getScoreDisplay(): string  // "2-1 (3-2 ET) [Home on pens]"
}

// GroupStandingPrediction - Tabla de grupo predicha (src/domain/entities/group-standing-prediction.entity.ts)
export class GroupStandingPrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly groupId: string,
    public readonly teamId: string,
    public readonly position: number,
    public readonly points: number,
    public readonly played: number,
    public readonly wins: number,
    public readonly draws: number,
    public readonly losses: number,
    public readonly goalsFor: number,
    public readonly goalsAgainst: number,
    public readonly goalDifference: number,
    public readonly hasTiebreakConflict: boolean,
    public readonly tiebreakGroup: number | null,
    public readonly manualTiebreakOrder: number | null,
    // ...
  ) {}

  qualifiesAsFirstOrSecond(): boolean
  isThirdPlace(): boolean
  hasConflict(): boolean
  compareByFIFACriteria(other: GroupStandingPrediction): number
}

// BestThirdPlacePrediction - Mejores terceros predichos (src/domain/entities/best-third-place-prediction.entity.ts)
export class BestThirdPlacePrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly teamId: string,
    public readonly rankingPosition: number,
    public readonly points: number,
    public readonly goalDifference: number,
    public readonly goalsFor: number,
    public readonly fromGroupId: string,
    public readonly hasTiebreakConflict: boolean,
    // ...
  ) {}

  qualifiesToRound32(): boolean
  hasConflict(): boolean
  compareByFIFACriteria(other: BestThirdPlacePrediction): number
}
```

### Repositorios - Predicciones

**IPlayerRepository** (`src/domain/repositories/player.repository.interface.ts`)
```typescript
export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByTeam(teamId: string): Promise<Player[]>;
  findByFilters(filters: PlayerFilters): Promise<Player[]>;
  findAllGoalkeepers(): Promise<Player[]>;
  findGoalkeepersByTeams(teamIds: string[]): Promise<Player[]>;
  findAll(): Promise<Player[]>;
  findByTeams(teamIds: string[]): Promise<Player[]>;
  exists(id: string): Promise<boolean>;
}
```

**IPredictionRepository** (`src/domain/repositories/prediction.repository.interface.ts`)
```typescript
export interface IPredictionRepository {
  // PREDICTION (Principal) - 13 métodos
  findById(id: string): Promise<Prediction | null>;
  findByUserAndLeague(userId: string, leagueId: string): Promise<Prediction | null>;
  findByUser(userId: string): Promise<Prediction[]>;
  findByLeague(leagueId: string): Promise<Prediction[]>;
  create(data: CreatePredictionData): Promise<Prediction>;
  updateAwards(id: string, data: UpdateAwardsData): Promise<Prediction>;
  updateChampion(id: string, data: UpdateChampionData): Promise<Prediction>;
  markGroupsCompleted(id: string): Promise<Prediction>;
  markKnockoutsCompleted(id: string): Promise<Prediction>;
  markAwardsCompleted(id: string): Promise<Prediction>;
  lock(id: string): Promise<Prediction>;
  updateTotalPoints(id: string, points: number): Promise<Prediction>;
  exists(userId: string, leagueId: string): Promise<boolean>;

  // MATCH PREDICTIONS - 7 métodos
  saveMatchPredictions(predictionId: string, matchPredictions: SaveMatchPredictionData[]): Promise<MatchPrediction[]>;
  findMatchPredictions(predictionId: string): Promise<MatchPrediction[]>;
  findMatchPredictionsByGroup(predictionId: string, groupId: string): Promise<MatchPrediction[]>;
  findMatchPrediction(predictionId: string, matchId: string): Promise<MatchPrediction | null>;
  updateMatchPredictionPoints(id: string, pointsEarned: number, pointsBreakdown: any): Promise<void>;

  // GROUP STANDINGS PREDICTIONS - 6 métodos
  saveGroupStandings(predictionId: string, standings: SaveGroupStandingData[]): Promise<GroupStandingPrediction[]>;
  findGroupStandings(predictionId: string, groupId: string): Promise<GroupStandingPrediction[]>;
  findAllGroupStandings(predictionId: string): Promise<GroupStandingPrediction[]>;
  updateTiebreakOrder(predictionId: string, groupId: string, tiebreaks: ResolveTiebreakData[]): Promise<void>;
  updateGroupStandingPoints(id: string, pointsEarned: number): Promise<void>;

  // BEST THIRD PLACES PREDICTIONS - 4 métodos
  saveBestThirdPlaces(predictionId: string, bestThirds: SaveBestThirdPlaceData[]): Promise<BestThirdPlacePrediction[]>;
  findBestThirdPlaces(predictionId: string): Promise<BestThirdPlacePrediction[]>;
  updateBestThirdPlacesTiebreak(predictionId: string, tiebreaks: ResolveTiebreakData[]): Promise<void>;
  updateBestThirdPlacePoints(id: string, pointsEarned: number): Promise<void>;

  // RANKINGS Y ESTADÍSTICAS - 2 métodos
  getLeagueRanking(leagueId: string): Promise<Array<{prediction: Prediction; user: {...}; position: number}>>;
  getPredictionStats(predictionId: string): Promise<{...}>;
}
```

**Total: 36 métodos** en IPredictionRepository

### Use Cases - Predicciones (Próximos a implementar)

**Player Use Cases:**
- `get-players-by-team.use-case.ts` - Obtener 23 jugadores de un equipo
- `get-all-goalkeepers.use-case.ts` - Porteros para Golden Glove
- `get-players-by-teams.use-case.ts` - Jugadores de equipos clasificados

**Prediction Use Cases:**
- `create-prediction.use-case.ts` - Crear predicción (auto al acceder a liga)
- `get-or-create-prediction.use-case.ts` - Obtener o crear si no existe
- `save-group-predictions.use-case.ts` - Guardar predicciones de un grupo
- `calculate-group-standings.use-case.ts` - Calcular tabla de posiciones
- `calculate-best-third-places.use-case.ts` - Calcular mejores terceros
- `save-knockout-predictions.use-case.ts` - Guardar eliminatorias
- `update-awards.use-case.ts` - Actualizar premios individuales
- `update-champion.use-case.ts` - Actualizar campeón
- `resolve-tiebreak.use-case.ts` - Resolver desempate manual
- `get-prediction-by-user-and-league.use-case.ts` - Obtener predicción
- `get-league-ranking.use-case.ts` - Ranking de liga
- `calculate-points.use-case.ts` - Calcular puntos (job/trigger)
- `lock-predictions.use-case.ts` - Bloquear cuando pasa deadline

### API Endpoints - Predicciones (Próximos a implementar)

```typescript
// PredictionController
GET    /predictions/league/:leagueId              // Obtener predicción del usuario en liga
POST   /predictions/league/:leagueId/groups/:groupId  // Guardar predicciones de grupo
GET    /predictions/league/:leagueId/groups/:groupId  // Obtener predicciones de grupo
PATCH  /predictions/:id/groups/:groupId/tiebreaks     // Resolver desempate
POST   /predictions/:id/knockouts                     // Guardar eliminatorias
PATCH  /predictions/:id/awards                        // Actualizar premios
PATCH  /predictions/:id/champion                      // Actualizar campeón
GET    /predictions/:id/stats                         // Estadísticas de predicción

// PlayerController
GET    /players/team/:teamId                      // Jugadores de un equipo
GET    /players/goalkeepers                       // Todos los porteros

// LeagueController (nuevos endpoints)
GET    /leagues/:leagueId/ranking                 // Ranking de liga
GET    /leagues/:leagueId/predictions             // Todas las predicciones de la liga
```

### Flujo Completo - Ejemplo Real

**Escenario**: Usuario "Alex" predice en liga "Mundial Familia"

**1. Usuario accede a predicciones de la liga**
```
GET /predictions/league/:leagueId

Backend:
- Busca predicción de Alex en esta liga
- Si no existe → Crea automáticamente (CreatePredictionUseCase)
- Retorna predicción vacía (draft)
```

**2. Usuario predice Grupo A**
```
POST /predictions/league/:leagueId/groups/A
Body: {
  matchPredictions: [
    { matchId: "uuid1", homeScore: 2, awayScore: 1 },  // MEX vs NZL
    { matchId: "uuid2", homeScore: 1, awayScore: 1 },  // URU vs EGY
    // ... 6 partidos del grupo
  ]
}

Backend (SaveGroupPredictionsUseCase):
1. Valida que predicción no esté bloqueada
2. Guarda match_predictions (batch INSERT)
3. Calcula tabla de posiciones:
   - MEX: 3 pts (victoria), GD +1, GF 2
   - URU: 1 pt (empate), GD 0, GF 1
   - EGY: 1 pt (empate), GD 0, GF 1
   - NZL: 0 pts (derrota), GD -1, GF 1
4. Ordena por: puntos → DG → GF
5. Detecta empate entre URU y EGY
6. Marca: has_tiebreak_conflict = TRUE, tiebreak_group = 1
7. Guarda group_standings_predictions
8. Retorna:
   {
     standings: [...],
     tiebreakConflicts: [
       { teams: ["URU", "EGY"], group: "A" }
     ]
   }

Frontend:
- Muestra tabla de posiciones
- Muestra mensaje: "⚠️ Uruguay y Egipto están empatados. ¿Deseas ajustar el orden?"
- Usuario arrastra equipos o deja orden actual
- Si ajusta: PATCH /predictions/:id/groups/A/tiebreaks
```

**3. Usuario completa todos los grupos (A-L)**
```
Backend (automático cuando se completa Grupo L):
1. Marca predictions.groups_completed = TRUE
2. Extrae 12 terceros de group_standings_predictions
3. Ordena por: puntos → DG → GF
4. Toma los 8 mejores
5. Guarda best_third_places_predictions
6. Retorna clasificados a R32:
   - 24 primeros/segundos de grupos
   - 8 mejores terceros

Frontend:
- Habilita fase eliminatorias
- Muestra bracket con los 32 clasificados
```

**4. Usuario predice eliminatorias**
```
POST /predictions/:id/knockouts
Body: {
  roundOf32: [
    { matchId: "uuid", homeScore: 2, awayScore: 2, homeScoreET: 3, awayScoreET: 2 },  // Prórroga
    { matchId: "uuid", homeScore: 1, awayScore: 1, homeScoreET: 2, awayScoreET: 2, penaltiesWinner: "home" },  // Penaltis
    // ... 16 partidos R32
  ],
  roundOf16: [...],
  quarters: [...],
  semis: [...],
  final: { matchId: "uuid", homeScore: 3, awayScore: 1 },
  championTeamId: "uuid-brasil"
}

Backend (SaveKnockoutPredictionsUseCase):
1. Valida que grupos estén completos
2. Valida que equipos en R32 coincidan con clasificados predichos
3. Guarda match_predictions para todas las eliminatorias
4. Actualiza predictions.champion_team_id
5. Marca predictions.knockouts_completed = TRUE
```

**5. Usuario selecciona premios**
```
PATCH /predictions/:id/awards
Body: {
  goldenBootPlayerId: "uuid-messi",
  goldenBallPlayerId: "uuid-mbappe",
  goldenGlovePlayerId: "uuid-alisson"
}

Backend:
1. Valida que players existan
2. Valida que Golden Glove sea portero
3. Actualiza predictions
4. Marca predictions.awards_completed = TRUE
```

**6. Predicción completa**
```
predictions.isComplete() = TRUE
- groups_completed: TRUE
- knockouts_completed: TRUE
- awards_completed: TRUE
- champion_team_id: "uuid-brasil"

Estado: 'complete' (esperando deadline y resultados reales)
```

**7. Deadline pasa (11 junio 2026, 19:00)**
```
Job/Cron ejecuta: LockPredictionsUseCase

Backend:
- Busca todas las predictions donde is_locked = FALSE
- Actualiza predictions.is_locked = TRUE, predictions.locked_at = NOW()
- Retorna: X predicciones bloqueadas

Usuario intenta editar después del deadline:
- canBeEdited() = FALSE
- Frontend: "Predicciones bloqueadas. El torneo ya comenzó."
```

**8. Partidos finalizan + Cálculo de puntos**
```
Admin actualiza: matches.status = 'FINISHED', scores, etc.

Job/Trigger ejecuta: CalculatePointsUseCase

Backend (por cada predicción):
1. Compara match_predictions vs matches (resultados reales)
2. Calcula puntos según POINTS_SYSTEM
3. Actualiza match_predictions.points_earned
4. Compara group_standings_predictions vs group_standings_actual
5. Actualiza group_standings_predictions.points_earned
6. Suma total de puntos
7. Actualiza predictions.total_points
8. Actualiza predictions.last_points_calculation

GET /leagues/:leagueId/ranking
Backend:
- Obtiene todas las predictions de la liga
- Ordena por total_points DESC
- Retorna ranking con posición, usuario, puntos
```

### Módulo NestJS - Predictions

**PredictionModule** (próximo a implementar)
```typescript
@Module({
  imports: [
    DatabaseModule,
    MatchModule,    // Para validar match_ids
    TeamModule,     // Para validar team_ids
  ],
  controllers: [
    PredictionController,
    PlayerController,
  ],
  providers: [
    // Player Use Cases
    GetPlayersByTeamUseCase,
    GetAllGoalkeepersUseCase,

    // Prediction Use Cases
    CreatePredictionUseCase,
    GetOrCreatePredictionUseCase,
    SaveGroupPredictionsUseCase,
    CalculateGroupStandingsUseCase,
    CalculateBestThirdPlacesUseCase,
    SaveKnockoutPredictionsUseCase,
    UpdateAwardsUseCase,
    UpdateChampionUseCase,
    ResolveTiebreakUseCase,
    GetPredictionByUserAndLeagueUseCase,
    GetLeagueRankingUseCase,
    CalculatePointsUseCase,
    LockPredictionsUseCase,

    // Repositories
    {
      provide: 'IPlayerRepository',
      useClass: PlayerRepository,
    },
    {
      provide: 'IPredictionRepository',
      useClass: PredictionRepository,
    },
  ],
  exports: [
    'IPlayerRepository',
    'IPredictionRepository',
    GetPredictionByUserAndLeagueUseCase,
    GetLeagueRankingUseCase,
  ],
})
export class PredictionModule {}
```

### Archivos Creados

**SQL Migration:**
- `predictions_system.sql` - Schema completo (7 tablas + seed de 1104 jugadores)

**Entidades del Dominio:**
- `src/domain/entities/player.entity.ts`
- `src/domain/entities/prediction.entity.ts`
- `src/domain/entities/match-prediction.entity.ts`
- `src/domain/entities/group-standing-prediction.entity.ts`
- `src/domain/entities/best-third-place-prediction.entity.ts`

**Interfaces de Repositorios:**
- `src/domain/repositories/player.repository.interface.ts`
- `src/domain/repositories/prediction.repository.interface.ts`

**Próximos pasos (Opción A - Implementación completa):**
- Repositorios concretos (SQL)
- Use Cases
- DTOs
- Controllers
- Módulos NestJS

## Documentación Complementaria

- `DEPLOYMENT.md` - Guía completa de deployment
- `PAYMENTS_INTEGRATION_GUIDE.md` - Integración Stripe detallada
- `DATABASE-BACKUP.md` - Backup y restore de PostgreSQL
- `HTTPS-SETUP.md` - Configuración SSL/TLS
- `SETUP-GUIDE.md` - Setup inicial del proyecto
- `predictions_system.sql` - Migration completa del sistema de predicciones
