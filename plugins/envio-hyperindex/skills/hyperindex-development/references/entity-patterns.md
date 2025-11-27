# Entity Patterns in HyperIndex

Patterns for defining and working with entities in HyperIndex.

## Schema Definition

### Basic Entity

```graphql
type Token {
  id: ID!
  name: String!
  symbol: String!
  decimals: BigInt!
  totalSupply: BigInt!
}
```

**Key differences from TheGraph:**
- No `@entity` decorator needed
- Use `String!` instead of `Bytes!`
- Use `BigInt!` for numbers (not `BigDecimal!` in schema)

### Entity Relationships

Use `_id` suffix for relationships:

```graphql
type Transfer {
  id: ID!
  from: String!
  to: String!
  amount: BigInt!
  token_id: String!  # References Token.id
  blockNumber: BigInt!
}

type Token {
  id: ID!
  name: String!
  symbol: String!
  transfers: [Transfer!]! @derivedFrom(field: "token")
}
```

**Critical:** Entity arrays MUST have `@derivedFrom`:

```graphql
# WRONG - Will fail codegen
type Transaction {
  mints: [Mint!]!  # Missing @derivedFrom
}

# CORRECT
type Transaction {
  id: ID!
  mints: [Mint!]! @derivedFrom(field: "transaction")
}

type Mint {
  id: ID!
  transaction_id: String!  # The relationship field
}
```

### Optional Fields

Use nullable types for optional fields:

```graphql
type Token {
  id: ID!
  name: String!
  symbol: String!
  logoUrl: String  # Optional - no !
}
```

**Important:** Use `undefined` not `null` in TypeScript:

```typescript
const token = {
  id: "0x...",
  name: "Token",
  symbol: "TKN",
  logoUrl: undefined,  // Not null
};
```

## Creating Entities

### Basic Creation

```typescript
MyContract.Transfer.handler(async ({ event, context }) => {
  const transfer = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
    token_id: event.srcAddress,  // Relationship
    blockNumber: BigInt(event.block.number),
  };

  context.Transfer.set(transfer);
});
```

### With Multichain ID

Always prefix IDs with chainId for multichain:

```typescript
const id = `${event.chainId}-${event.params.tokenId}`;
```

### Entity ID Patterns

```typescript
// Event-based (unique per event)
`${event.chainId}-${event.transaction.hash}-${event.logIndex}`

// Address-based (singleton per address per chain)
`${event.chainId}-${event.srcAddress}`

// Composite (multiple keys)
`${event.chainId}-${event.params.user}-${event.params.tokenId}`

// Time-based (daily aggregates)
`${event.chainId}-${dayTimestamp}-${event.srcAddress}`
```

## Updating Entities

**Entities are immutable.** Use spread operator for updates:

```typescript
MyContract.Transfer.handler(async ({ event, context }) => {
  const token = await context.Token.get(event.srcAddress);

  if (token) {
    // CORRECT - Use spread operator
    const updatedToken = {
      ...token,
      totalSupply: token.totalSupply + event.params.amount,
      lastUpdated: BigInt(event.block.timestamp),
    };
    context.Token.set(updatedToken);
  }
});
```

**Never mutate directly:**

```typescript
// WRONG - Entities are read-only
token.totalSupply = newSupply;
context.Token.set(token);  // Won't work
```

## Loading Entities

### Get by ID

```typescript
const token = await context.Token.get(tokenId);
if (token) {
  // Token exists
}
```

### Get or Create Pattern

```typescript
MyContract.Transfer.handler(async ({ event, context }) => {
  let token = await context.Token.get(event.srcAddress);

  if (!token) {
    token = {
      id: event.srcAddress,
      name: "Unknown",
      symbol: "???",
      decimals: BigInt(18),
      totalSupply: BigInt(0),
    };
  }

  const updatedToken = {
    ...token,
    totalSupply: token.totalSupply + event.params.amount,
  };

  context.Token.set(updatedToken);
});
```

## Querying Related Entities

`@derivedFrom` arrays are virtual - cannot access in handlers:

```typescript
// WRONG - derivedFrom arrays don't exist in handlers
const transfers = token.transfers;

// CORRECT - Query using indexed field
// (If using indexed field operations)
const transfers = await context.Transfer.getWhere.token_id.eq(tokenId);
```

## BigDecimal Handling

For precision in calculations, use BigDecimal:

```typescript
import { BigDecimal } from "generated";

const ZERO_BD = new BigDecimal(0);
const ONE_BD = new BigDecimal(1);

// Convert token amount to decimal
function convertToDecimal(amount: bigint, decimals: bigint): BigDecimal {
  const divisor = new BigDecimal(10n ** decimals);
  return new BigDecimal(amount.toString()).div(divisor);
}
```

**Schema types vs code types:**
- Schema `BigInt!` → TypeScript `bigint`
- Schema `BigDecimal!` → TypeScript `BigDecimal`
- Schema `Int!` → TypeScript `number`

## Timestamp Handling

Always cast timestamps:

```typescript
// CORRECT
timestamp: BigInt(event.block.timestamp)

// For day calculations
const dayTimestamp = Math.floor(event.block.timestamp / 86400) * 86400;
const dayId = `${event.chainId}-${dayTimestamp}`;
```

## Common Entity Types

### Token Entity

```graphql
type Token {
  id: ID!
  address: String!
  name: String!
  symbol: String!
  decimals: BigInt!
  totalSupply: BigInt!
  transfers: [Transfer!]! @derivedFrom(field: "token")
}
```

### Transfer Entity

```graphql
type Transfer {
  id: ID!
  token_id: String!
  from: String!
  to: String!
  amount: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: String!
}
```

### Daily Aggregate Entity

```graphql
type TokenDayData {
  id: ID!  # chainId-dayTimestamp-tokenAddress
  token_id: String!
  date: Int!  # Unix timestamp of day start
  volume: BigDecimal!
  txCount: BigInt!
  open: BigDecimal!
  high: BigDecimal!
  low: BigDecimal!
  close: BigDecimal!
}
```

## Entity Checklist

When defining entities:
- [ ] Use `ID!` for id field
- [ ] Use `String!` for addresses (not `Bytes!`)
- [ ] Use `_id` suffix for relationships
- [ ] Add `@derivedFrom` to all entity arrays
- [ ] No `@entity` decorator
- [ ] Consider multichain ID prefixes
- [ ] Match field types exactly (BigInt vs BigDecimal vs Int)
