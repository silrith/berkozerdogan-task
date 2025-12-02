# Design Document - Transaction Management API

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Service Layer Design](#service-layer-design)
7. [Testing Strategy](#testing-strategy)
8. [Error Handling](#error-handling)
9. [Validation Strategy](#validation-strategy)
10. [Decision Rationale](#decision-rationale)

---

## Overview

### Project Purpose

Transaction Management API is a NestJS-based REST API designed to manage real estate transactions with a focus on:
- **Lifecycle Management**: Track transactions through distinct stages
- **Financial Transparency**: Automatic calculation of commission breakdowns
- **Audit Trail**: Complete history of stage transitions and changes
- **Type Safety**: Full TypeScript implementation with comprehensive testing

### Core Entities

- **Transaction**: Main entity representing a real estate transaction
  - Contains financial data, agent information, and stage history
  - Tracks all stage changes with timestamps
  - Calculates commission splits automatically

### Key Features

1. **Multi-Stage Workflow**: AGREEMENT → EARNEST_MONEY → TITLE_DEED → COMPLETED
2. **Commission Calculation**: Automatic 50/50 split between listing and selling agents
3. **Stage History Tracking**: Immutable audit trail of all changes
4. **Change Tracking**: Records what changed and when for compliance

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│          HTTP Request/Response                   │
├─────────────────────────────────────────────────┤
│  Controllers (Route Handlers, Input Validation) │
├─────────────────────────────────────────────────┤
│  Services (Business Logic, Calculations)        │
├─────────────────────────────────────────────────┤
│  Data Access (Mongoose Models, Database Ops)   │
├─────────────────────────────────────────────────┤
│          MongoDB (Persistence Layer)             │
└─────────────────────────────────────────────────┘
```

### Module Structure

```
berkozerdogan-task/
├── app.module.ts              # Root module
│
└── transaction/               # Transaction module
    ├── transaction.module.ts  # Module definition
    ├── transaction.controller.ts  # HTTP handlers
    ├── transaction.service.ts     # Business logic
    ├── schemas/
    │   └── transaction.schema.ts  # Mongoose schema
    ├── dto/                       # Data Transfer Objects
    │   ├── create-transaction.dto.ts
    │   ├── update-transaction.dto.ts
    │   └── index.ts
    └── tests/
        ├── transaction.controller.spec.ts
        └── transaction.service.spec.ts
```

### Design Principles

1. **Single Responsibility**: Each class has one reason to change
   - Controller: HTTP concerns only
   - Service: Business logic
   - Schema: Data structure
   - DTO: Input/output validation

2. **Dependency Injection**: All dependencies injected via NestJS
   - Enables testing with mocks
   - Loose coupling between layers
   - Easy to swap implementations

3. **Type Safety**: Full TypeScript throughout
   - Compile-time type checking
   - Better IDE support
   - Fewer runtime errors

4. **Immutability of History**: Stage history is append-only
   - Cannot modify past transitions
   - Complete audit trail
   - Compliance ready

---

## Technology Stack

### Core Framework

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript runtime |
| **Framework** | NestJS | 11.0.1 | Progressive Node.js framework |
| **Language** | TypeScript | 5.7.3 | Type-safe development |
| **Build** | TypeScript Compiler | 5.7.3 | Compiles TS to JS |

### Database & ODM

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Database** | MongoDB | 8.20.1+ | NoSQL document storage |
| **ODM** | Mongoose | 8.20.1 | MongoDB object modeling |
| **Cloud** | MongoDB Atlas | Latest | Managed MongoDB hosting |

### Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Test Framework** | Jest | 30.0.0 | Unit & integration testing |
| **Test Utils** | @nestjs/testing | 11.0.1 | NestJS testing utilities |
| **Assertion** | Jest matchers | Built-in | Test assertions |

### Code Quality

| Tool | Version | Purpose |
|------|---------|---------|
| **Linter** | ESLint | 9.18.0 | Code style & quality |
| **Formatter** | Prettier | 3.4.2 | Code formatting |
| **TypeScript ESLint** | 8.20.0 | TypeScript-specific rules |

### Validation & Transformation

| Library | Version | Purpose |
|---------|---------|---------|
| **Validation** | class-validator | 0.14.3 | DTO validation decorators |
| **Transformation** | class-transformer | 0.5.1 | Object transformation |

---

## Database Design

### Transaction Schema

```typescript
{
  _id: ObjectId,
  totalServiceFee: Number,
  listingAgent?: String,
  sellingAgent?: String,
  
  // Stage Management
  stage: enum(TransactionStage),
  stageHistory: [{
    stage: enum,
    changes: Record<string, any>,
    updatedAt: Date
  }],
  
  financialBreakdown: {
    agency: Number,
    listingAgent?: Number,
    sellingAgent?: Number
  },
  
  earnest_money?: Number,
  commissionDetail?: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Key Design Decisions

1. **Agent Optional Fields**: Transactions can be created without agents
   - Supports partial data entry
   - Agents added later if needed

2. **StageHistory Append-Only**: Cannot modify existing history entries
   - Ensures audit compliance
   - Tracks exact transition times
   - Shows what changed at each step

3. **FinancialBreakdown Recalculation**: Recalculated on stage completion
   - Ensures accuracy
   - Reflects final agreed amounts
   - Commission detail explains distribution

4. **Timestamps**: Automatically managed by Mongoose
   - No manual date handling needed
   - Consistent across database
   - Built-in createdAt/updatedAt

### Indexes

Recommended MongoDB indexes for performance:

```javascript
db.transactions.createIndex({ stage: 1 })
db.transactions.createIndex({ createdAt: -1 })
db.transactions.createIndex({ "stageHistory.stage": 1 })
```

---

## API Design

### RESTful Principles

| HTTP Method | Resource | Operation | Status |
|-------------|----------|-----------|--------|
| `POST` | `/transaction/create` | Create new transaction | 201 |
| `GET` | `/transaction/getAll` | Fetch all transactions | 200 |
| `GET` | `/transaction/:id` | Fetch single transaction | 200 |
| `PATCH` | `/transaction/update` | Update transaction stage | 200 |

### Request/Response Format

#### Create Transaction

**Request:**
```http
POST /transaction/create
Content-Type: application/json

{
  "totalServiceFee": 1000,
  "listingAgent": "Alice",
  "sellingAgent": "Bob"
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "totalServiceFee": 1000,
  "listingAgent": "Alice",
  "sellingAgent": "Bob",
  "stage": "agreement",
  "financialBreakdown": {
    "agency": 500,
    "listingAgent": 250,
    "sellingAgent": 250
  },
  "stageHistory": [],
  "createdAt": "2024-12-02T10:00:00Z",
  "updatedAt": "2024-12-02T10:00:00Z"
}
```

#### Update Stage

**Request:**
```http
PATCH /transaction/update
Content-Type: application/json

{
  "id": "507f1f77bcf86cd799439011",
  "stage": "earnest_money",
  "earnest_money": 300
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "stage": "earnest_money",
  "earnest_money": 300,
  "stageHistory": [
    {
      "stage": "earnest_money",
      "changes": {
        "earnest_money": 300,
        "stage": { "from": "agreement", "to": "earnest_money" }
      },
      "updatedAt": "2024-12-02T10:30:00Z"
    }
  ]
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Transaction with id 999 not found",
  "error": "Not Found"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Transaction creation failed",
  "error": "Internal Server Error"
}
```

### API Versioning (Future)

Current API: v1 (implicit)
- Consider `/api/v1/transaction/...` for future versions
- Maintains backward compatibility

---

## Service Layer Design

### TransactionService Responsibilities

1. **Create Transactions**
   - Input validation
   - Initial commission calculation
   - Stage initialization (always AGREEMENT)
   - Error handling

2. **Query Transactions**
   - Fetch all transactions
   - Fetch single transaction by ID
   - Error handling for missing data

3. **Update Stage**
   - Validate stage transitions
   - Track changes
   - Recalculate financial data if needed
   - Update stage history
   - Generate commission details

4. **Calculate Commission**
   - Determine agent shares based on rules
   - Same agent: all commission to listing agent
   - Different agents: 50/50 split
   - Agency always gets 50%

### State Machine: Stage Transitions

```
┌──────────────────────────────────────────────────┐
│                  START                            │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   AGREEMENT     │
            │  (Initial Stage)│
            └────────┬────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   EARNEST_MONEY       │
        │ (Earnest money dep.)  │
        └────────┬──────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │   TITLE_DEED          │
        │ (Title prepared)      │
        └────────┬──────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │   COMPLETED           │
        │ (Transaction done)    │
        └────────┬──────────────┘
                 │
                 ▼
            ┌─────────────┐
            │      END    │
            └─────────────┘
```

**Validation Rules:**
- Each transition is one-way, sequential
- No skipping stages allowed
- Cannot go backward
- COMPLETED stage is final (no transitions allowed)

---

## Testing Strategy

### Unit Testing Approach

#### Service Tests (11 tests)

**Coverage Areas:**
1. **createTransaction**
   - Successful creation with valid data
   - Error handling on save failure
   - Initial stage set to AGREEMENT
   - Commission breakdown calculated

2. **calculateCommission (private method)**
   - Same agent: 50% listing agent + 50% agency
   - Different agents: 25% each + 50% agency
   - No agents: 100% agency
   - Edge cases with decimal amounts

3. **findAll/findOne**
   - Return all transactions
   - Return single transaction
   - Handle not found errors
   - Database connectivity

4. **updateStage**
   - Valid transitions pass through
   - Invalid transitions throw error
   - Changes tracked in stageHistory
   - Financial data recalculated on COMPLETED

#### Controller Tests (8 tests)

**Coverage Areas:**
1. **Route Handlers**
   - Correct service methods called
   - Correct parameters passed
   - Results returned to client

2. **Error Propagation**
   - Service errors bubble up
   - Proper HTTP status codes
   - Error messages reach client

3. **Input Handling**
   - DTOs validated before service
   - Invalid data rejected
   - Type safety enforced

### Mock Strategy

**Service Mocks:**
```typescript
const mockService = {
  createTransaction: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStage: jest.fn(),
};
```

**Model Mocks:**
```typescript
class MockTransactionModel {
  constructor(data) { Object.assign(this, data); }
  save = jest.fn().mockResolvedValue(this);
  static find = jest.fn();
  static findById = jest.fn();
}
```

### Test Execution

```bash
# All tests
npm test

# Watch mode (re-run on change)
npm run test:watch

# Coverage report
npm run test:cov

# Specific file
npx jest --runTestsByPath ./src/transaction/transaction.service.spec.ts

# Specific test
npm test -- -t "createTransaction"
```

### Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Statement | 90%+ | Tracked via coverage |
| Branch | 85%+ | Tracked via coverage |
| Function | 90%+ | Tracked via coverage |
| Line | 90%+ | Tracked via coverage |

---

## Error Handling

### Exception Types

#### NotFoundException

**When:** Transaction ID doesn't exist
```typescript
throw new NotFoundException(`Transaction with id ${id} not found`);
```

**HTTP Response:** 404 Not Found

#### InternalServerErrorException

**When:** Database operation fails
```typescript
throw new InternalServerErrorException('Transaction creation failed');
```

**HTTP Response:** 500 Internal Server Error

#### BadRequestException

**When:** Invalid input data
```typescript
throw new BadRequestException('Earnest money must be provided');
```

**HTTP Response:** 400 Bad Request

#### Custom Business Error

**When:** Invalid stage transition
```typescript
throw new Error(`Invalid stage transition from "${current}" to "${next}"`);
```

### Error Handling Flow

```
┌──────────────────────┐
│  Request Arrives     │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  Route Handler       │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────┐
│  Service Method      │
│  (May throw error)   │
└─────────┬────────────┘
          │
    ┌─────┴──────┐
    │             │
    ▼             ▼
Success        Error
    │             │
    └──┬──┬───────┘
       │  │
       ▼  ▼
    Global Exception Filter
       │
    ┌──┴──┐
    │     │
    ▼     ▼
 200OK  4xx/5xx
```

### Global Error Handler

NestJS Global Exception Filter (recommended):
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
  }
}
```

---

## Validation Strategy

### Input Validation (DTOs)

#### CreateTransactionDto

```typescript
export class CreateTransactionDto {
  @IsNumber()
  totalServiceFee: number;

  @IsOptional()
  @IsString()
  listingAgent?: string;

  @IsOptional()
  @IsString()
  sellingAgent?: string;

  @IsOptional()
  stage?: TransactionStage;
}
```

**Validation Rules:**
- `totalServiceFee`: Required, must be number
- `listingAgent`: Optional, must be string if provided
- `sellingAgent`: Optional, must be string if provided
- `stage`: Optional, must be valid TransactionStage enum

#### UpdateTransactionDto

```typescript
export class UpdateTransactionDto {
  @IsString()
  id: string;

  @IsEnum(TransactionStage)
  stage: TransactionStage;

  @IsOptional()
  @IsNumber()
  earnest_money?: number;
}
```

**Validation Rules:**
- `id`: Required, must be valid MongoDB ObjectId string
- `stage`: Required, must be valid enum value
- `earnest_money`: Optional, required when stage = EARNEST_MONEY

### Business Logic Validation

#### Stage Transitions

```typescript
const validTransitions: Record<TransactionStage, TransactionStage[]> = {
  [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
  [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
  [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
  [TransactionStage.COMPLETED]: [],
};
```

#### Required Fields by Stage

| Stage | Required Fields | Behavior |
|-------|-----------------|----------|
| AGREEMENT | - | Initial state |
| EARNEST_MONEY | `earnest_money` | Tracks deposit amount |
| TITLE_DEED | - | Preparation phase |
| COMPLETED | - | Recalculates financials |

---

## Decision Rationale

### Why NestJS?

✅ **Chosen because:**
- Built-in dependency injection
- TypeScript-first framework
- Modular architecture support
- Excellent testing utilities
- Active ecosystem
- Industry standard for Node.js APIs

### Why MongoDB?

✅ **Chosen because:**
- Flexible schema for transaction data
- Native support for nested objects (stageHistory)
- Horizontal scalability
- MongoDB Atlas for managed hosting
- Fast prototyping
- Document-oriented fits transaction structure

### Why Mongoose?

✅ **Chosen because:**
- Type-safe schema definition
- Validation built-in
- Middleware support (pre/post hooks)
- Plugin ecosystem
- Query builder
- Mongoose with TypeScript provides excellent type safety

### Why Jest?

✅ **Chosen because:**
- Zero configuration needed
- Great snapshot testing
- Mock utilities built-in
- TypeScript support
- Fast test execution
- Jest is NestJS recommended testing framework

### Why Layered Architecture?

✅ **Chosen because:**
- Clear separation of concerns
- Easy to test each layer independently
- Easy to replace implementations
- Follows SOLID principles
- Team can work on different layers independently
- Standard enterprise pattern

### Why Immutable Stage History?

✅ **Chosen because:**
- Audit trail for compliance
- Cannot accidentally modify past transactions
- Complete traceability
- Helps debug issues
- Supports regulatory requirements

### Why State Machine Pattern?

✅ **Chosen because:**
- Clear, valid transitions
- Prevents invalid states
- Easy to visualize flow
- Reduces bugs
- Self-documenting code
- Easier to test and maintain

---

## Future Enhancements

### Phase 2 Features

1. **User Authentication**
   - JWT tokens
   - Role-based access control
   - User-specific transaction filtering

2. **Advanced Queries**
   - Pagination with limit/offset
   - Sorting by date, amount, agent
   - Filtering by stage, amount range
   - Full-text search on agent names

3. **Analytics**
   - Transaction statistics
   - Commission trends
   - Agent performance metrics
   - Time-in-stage analysis

4. **Webhooks**
   - Notifications on stage changes
   - External system integration
   - Event-driven architecture

5. **File Storage**
   - Upload transaction documents
   - Store signatures
   - Archive historical documents

### Scalability Considerations

1. **Database Optimization**
   - Index strategy for large datasets
   - Query optimization
   - Caching layer (Redis)

2. **API Performance**
   - Response compression
   - Pagination for large result sets
   - Database query optimization

3. **Horizontal Scaling**
   - Stateless service design (already implemented)
   - Load balancing
   - Message queue for async operations

4. **Monitoring & Observability**
   - Structured logging
   - Performance metrics
   - Error tracking (Sentry)
   - Distributed tracing

---

## Most Challenging & Risky Design Decisions

### Challenge 1: State Machine Enforcement

**The Problem:**
Transactions must progress through fixed stages in strict order:
`AGREEMENT → EARNEST_MONEY → TITLE_DEED → COMPLETED`

Any out-of-order transition would corrupt business logic:
- Skipping to COMPLETED without going through intermediate stages
- Jumping backwards (COMPLETED → EARNEST_MONEY)
- Invalid parallel transitions

**Why It's Risky:**
- Invalid data in production affects financial calculations
- Hard to recover from bad state transitions
- Regulatory compliance could be violated

**How We Mitigated It:**
```typescript
private validateStageTransition(current: TransactionStage, next: TransactionStage) {
  const validTransitions: Record<TransactionStage, TransactionStage[]> = {
    [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
    [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
    [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
    [TransactionStage.COMPLETED]: [],
  };

  if (!validTransitions[current].includes(next)) {
    throw new Error(`Invalid transition from "${current}" to "${next}"`);
  }
}
```

- **Testing**: 4 dedicated tests verify all valid and invalid transitions
- **Documentation**: Clear state machine diagram in schema
- **Type Safety**: Using TypeScript enums prevents string typos
- **Immutability**: Stage history is append-only for audit trail

### Challenge 2: Commission Calculation Logic

**The Problem:**
Commission split has complex rules that must be 100% accurate:
- 50% always goes to agency
- Remaining 50% is split among agents based on relationship:
  - **Same agent**: 100% of agent portion (50% total) to that agent
  - **Different agents**: 50% split equally (25% each)

**Why It's Risky:**
- Any rounding error compounds across many transactions
- Financial mistakes damage business relationships
- Needs to support edge cases (fractional amounts, high-value deals)
- Must recalculate only when transaction is COMPLETED

**How We Mitigated It:**
```typescript
private calculateCommission(data: CreateTransactionDto | Transaction) {
  const total = data.totalServiceFee;
  const agencyShare = total * 0.5;
  
  let listingShare = 0;
  let sellingShare = 0;

  const { listingAgent, sellingAgent } = data;

  if (listingAgent === sellingAgent) {
    listingShare = total * 0.5;
  } else {
    listingShare = total * 0.25;
    sellingShare = total * 0.25;
  }

  return {
    agency: agencyShare,
    listingAgent: listingShare || undefined,
    sellingAgent: sellingShare || undefined,
  };
}
```

- **Testing**: 6 dedicated tests cover all scenarios:
  - Different agents (50/50 split)
  - Same agent (full 50% to one agent)
  - Edge cases (decimals, large amounts, zero)
- **Type Safety**: Numeric calculations with TypeScript prevent string math
- **Late Calculation**: Only calculate on COMPLETED to avoid premature calculations
- **History Tracking**: Commission changes are recorded in stage history

### Challenge 3: Data Consistency & Immutability

**The Problem:**
Once a transaction moves to COMPLETED, the financial breakdown must never change:
- Prevents accidental overwriting of financial data
- Supports audit requirements
- Ensures historical accuracy

But we also need flexibility during earlier stages.

**Why It's Risky:**
- Could accidentally modify historical data
- Hard to trace who changed what and when
- Regulatory compliance requires immutable audit trail
- Business logic depends on this guarantee

**How We Mitigated It:**
```typescript
stageHistory: {
  type: [
    {
      stage: { type: String, enum: Object.values(TransactionStage), required: true },
      changes: { type: Object, default: {} },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  default: [],
}

transaction.stageHistory.push({
  stage: dto.stage,
  changes,
  updatedAt: new Date(),
});
```

- **Database**: Array is append-only (MongoDB doesn't allow modification)
- **Code**: Never update history entries, only add new ones
- **Testing**: Tests verify stage history grows correctly
- **Audit Trail**: Every change is timestamped with what changed

### Challenge 4: Input Validation & DTO Design

**The Problem:**
DTOs must validate:
- Type correctness (strings are strings, numbers are numbers)
- Required vs optional fields at different endpoints
- Field constraints (positive numbers only, valid enum values)
- Agent names cannot be empty

**Why It's Risky:**
- Invalid data could reach business logic layer
- Type mismatches cause runtime errors
- Missing validation leads to data corruption
- API consumers might send wrong data types

**How We Mitigated It:**
```typescript
export class CreateTransactionDto {
  @IsNumber()
  @Min(0)
  totalServiceFee: number;

  @IsString()
  @IsNotEmpty()
  listingAgent: string;

  @IsString()
  @IsNotEmpty()
  sellingAgent: string;
}

export class UpdateTransactionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(TransactionStage)
  @IsNotEmpty()
  stage: TransactionStage;

  @IsNumber()
  @IsOptional()
  @Min(0)
  earnest_money?: number;
}

app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
);
```

- **Compile-Time**: TypeScript enforces type checking
- **Runtime**: class-validator decorators validate at request time
- **Testing**: 19 unit tests verify validation logic
- **Error Responses**: Invalid requests return 400 with clear messages

---

## If Implemented in Real Life — What's Next?

### Phase 2: Authentication & Authorization (High Priority)

**Why it's needed:**
- Currently anyone can access any transaction
- No audit trail of who made changes
- Multiple agencies need isolated data
- Agents need to see only their transactions

**Implementation Plan:**
```typescript
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
})

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'AGENT')
@Patch(':id')
async updateStage(...) { }

async findAll(@Request() req) {
  return this.transactionModel
    .find({ agencyId: req.user.agencyId })
    .exec();
}
```

**Effort**: ~2-3 days

### Phase 2: Advanced Query Features (High Priority)

**Why it's needed:**
- No pagination support for large datasets
- Cannot filter by stage, date range, or amount
- No sorting capabilities
- Agencies need reporting/analytics

**Implementation Plan:**
```typescript
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  const skip = (page - 1) * limit;
  return this.transactionModel
    .find()
    .skip(skip)
    .limit(limit)
    .exec();
}

@Get()
async findAll(@Query() filters: FilterTransactionDto) {
  const query = {};
  if (filters.stage) query['stage'] = filters.stage;
  if (filters.minAmount) query['totalServiceFee'] = { $gte: filters.minAmount };
  if (filters.maxAmount) query['totalServiceFee'] = { $lte: filters.maxAmount };
  return this.transactionModel.find(query).exec();
}

@Get()
async findAll(@Query('sortBy') sortBy: string = 'createdAt') {
  return this.transactionModel
    .find()
    .sort({ [sortBy]: -1 })
    .exec();
}
```

**Effort**: ~2-3 days

### Phase 3: Analytics & Reporting (Medium Priority)

**Why it's needed:**
- Business needs to track commission distribution over time
- Need insights into transaction value distribution
- Agent performance analytics
- Monthly financial reports

**Implementation Plan:**
```typescript
@Get('analytics/by-stage')
async getAnalyticsByStage() {
  return this.transactionModel.aggregate([
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalServiceFee' },
        avgValue: { $avg: '$totalServiceFee' },
      },
    },
  ]).exec();
}

@Get('reports/agent-commission/:agentId')
async getAgentCommission(@Param('agentId') agentId: string) {
  return this.transactionModel
    .find({
      $or: [
        { listingAgent: agentId },
        { sellingAgent: agentId },
      ],
      stage: TransactionStage.COMPLETED,
    })
    .exec();
}
```

**Effort**: ~3-5 days

### Phase 4: Webhooks & Event System (Medium Priority)

**Why it's needed:**
- External systems need real-time transaction updates
- Accounting system needs to know when COMPLETED
- CRM needs to sync agent commission data

**Implementation Plan:**
```typescript
async updateStage(dto: UpdateTransactionDto) {
  const transaction = await this.service.updateStage(dto);
  
  this.eventEmitter.emit('transaction.stage-updated', {
    transactionId: transaction._id,
    stage: transaction.stage,
    timestamp: new Date(),
  });
  
  return transaction;
}

@OnEvent('transaction.stage-updated')
handleTransactionStageUpdated(payload: any) {
  await this.webhookService.notify('https://accounting-system.com/webhook', payload);
  await this.emailService.send(payload);
}
```

**Effort**: ~3-4 days

### Phase 5: Document Signing & Compliance (Low Priority - Future)

**Why it's needed:**
- Need digital signatures for stage transitions
- Regulatory compliance (some jurisdictions require signatures)
- Proof of authorization

**Implementation Plan:**
- Integrate with DocuSign or similar
- Require signature at each stage transition
- Store signature metadata

**Effort**: ~1 week

### Scaling Considerations

1. **Database Indexing**:
   ```typescript
   TransactionSchema.index({ stage: 1 });
   TransactionSchema.index({ listingAgent: 1 });
   TransactionSchema.index({ createdAt: -1 });
   TransactionSchema.index({ agencyId: 1, stage: 1 });
   ```

2. **Caching**:
   - Add Redis for frequently accessed transactions
   - Cache analytics results

3. **Load Balancing**:
   - Run multiple NestJS instances
   - Use load balancer (Nginx, AWS ALB)

4. **Database Scaling**:
   - MongoDB Atlas handles scaling automatically
   - May need read replicas for analytics

5. **Monitoring**:
   - Set up APM (Application Performance Monitoring)
   - Add error tracking (Sentry)
   - Monitor database query performance

---

## Deployment Architecture

```
┌─────────────────────┐
│   Client (Browser)  │
└──────────┬──────────┘
           │ HTTP/HTTPS
           ▼
┌─────────────────────┐
│   Load Balancer     │
│  (Nginx/AWS ALB)    │
└──────────┬──────────┘
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
┌────────────────────┐
│  API Instances     │ (Horizontal scaling)
│  (Container/Pod)   │
│  Running NestJS    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  MongoDB Atlas     │
│  (Managed DB)      │
└────────────────────┘
```

---

## Security Considerations

### Environment Variables

Sensitive data managed via `.env`:
- MongoDB connection string
- API keys
- Port configuration
- Node environment

### Input Validation

All inputs validated via DTOs:
- Prevents SQL/NoSQL injection
- Type checking at runtime
- Sanitization of strings

### Error Messages

Avoid exposing sensitive info:
- Don't reveal database structure
- Generic error messages to clients
- Detailed logs server-side

### Future Security

1. **Authentication**: JWT-based auth
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent abuse
4. **CORS**: Control cross-origin requests
5. **API Key Management**: For third-party access

---

## Monitoring & Logging

### Logging Strategy

```typescript
logger.error('Database connection failed', error);

logger.log('Transaction created', { id, totalServiceFee });

logger.debug('Stage validation passed', { current, next });
```

### Metrics to Track

- Request count per endpoint
- Response time by endpoint
- Error rate and types
- Database query performance
- Memory usage
- CPU utilization

---

## References

- [NestJS Documentation](https://docs.nestjs.com)
- [MongoDB Design Patterns](https://docs.mongodb.com/manual/applications/data-models/)
- [REST API Best Practices](https://restfulapi.net)
- [Testing Best Practices](https://docs.nestjs.com/fundamentals/testing)
- [State Machines](https://en.wikipedia.org/wiki/Finite-state_machine)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-02  
**Author:** Berk Ozerdogan
