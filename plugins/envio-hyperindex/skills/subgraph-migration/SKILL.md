---
name: Subgraph Migration
description: This skill should be used when the user asks to "migrate from subgraph", "convert subgraph to hyperindex", "migrate from thegraph", "port subgraph", "convert subgraph handlers", "migrate assemblyscript to typescript", or mentions TheGraph, subgraph migration, subgraph.yaml conversion, or converting from TheGraph to Envio. For core HyperIndex development patterns, refer to the hyperindex-development skill.
version: 1.0.0
---

# Subgraph to HyperIndex Migration

Migrate from TheGraph subgraphs to Envio HyperIndex. HyperIndex delivers up to 100x faster indexing with a developer-friendly TypeScript API.

## Migration Overview

Three major steps:
1. `subgraph.yaml` → `config.yaml`
2. Schema migration (near copy-paste)
3. Event handler migration (AssemblyScript → TypeScript)

## Step 1: Config Migration

### subgraph.yaml → config.yaml

**TheGraph:**
```yaml
specVersion: 0.0.4
dataSources:
  - kind: ethereum/contract
    name: Factory
    network: mainnet
    source:
      address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
      startBlock: 10000835
      abi: Factory
    mapping:
      eventHandlers:
        - event: PairCreated(indexed address,indexed address,address,uint256)
          handler: handlePairCreated
templates:
  - name: Pair
    source:
      abi: Pair
```

**HyperIndex:**
```yaml
name: my-indexer
networks:
  - id: 1
    start_block: 10000835
    contracts:
      - name: Factory
        address: 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
        handler: src/factory.ts
        events:
          - event: PairCreated(address indexed token0, address indexed token1, address pair, uint256)
      - name: Pair
        handler: src/pair.ts  # No address - dynamic
        events:
          - event: Swap(...)
```

**Key differences:**
- Remove `dataSources`, `templates`, `mapping` nesting
- Use `networks` → `contracts` structure
- Event signatures include parameter names
- Dynamic contracts have no address field

## Step 2: Schema Migration

### Remove @entity decorator

```graphql
# TheGraph
type Token @entity {
  id: ID!
  symbol: String!
}

# HyperIndex
type Token {
  id: ID!
  symbol: String!
}
```

### Convert Bytes to String

```graphql
# TheGraph
address: Bytes!

# HyperIndex
address: String!
```

### Entity Relationships

```graphql
# TheGraph
type Transfer @entity {
  token: Token!
}

# HyperIndex - use _id suffix
type Transfer {
  token_id: String!
}
```

### Entity Arrays MUST have @derivedFrom

```graphql
# TheGraph (sometimes implicit)
type Token @entity {
  transfers: [Transfer!]!
}

# HyperIndex - REQUIRED explicit @derivedFrom
type Token {
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type Transfer {
  token_id: String!  # The field referenced by @derivedFrom
}
```

**Critical:** Arrays without `@derivedFrom` cause codegen error EE211.

## Step 3: Handler Migration

### Basic Pattern

**TheGraph (AssemblyScript):**
```typescript
export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(event.transaction.hash.toHexString());
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.amount = event.params.value;
  entity.save();
}
```

**HyperIndex (TypeScript):**
```typescript
import { MyContract } from "generated";

MyContract.Transfer.handler(async ({ event, context }) => {
  const entity = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.value,
    blockNumber: BigInt(event.block.number),
  };

  context.Transfer.set(entity);
});
```

### Entity Loading

**TheGraph:**
```typescript
let token = Token.load(id);
if (token == null) {
  token = new Token(id);
}
```

**HyperIndex:**
```typescript
let token = await context.Token.get(id);
if (!token) {
  token = { id, name: "Unknown", /* ... */ };
}
```

### Entity Updates

**TheGraph:**
```typescript
token.totalSupply = newSupply;
token.save();
```

**HyperIndex (use spread - entities are immutable):**
```typescript
context.Token.set({
  ...token,
  totalSupply: newSupply,
});
```

### Dynamic Contract Registration

**TheGraph:**
```typescript
import { Pair as PairTemplate } from "../generated/templates";
PairTemplate.create(event.params.pair);
```

**HyperIndex:**
```typescript
// Register BEFORE handler
Factory.PairCreated.contractRegister(({ event, context }) => {
  context.addPair(event.params.pair);
});

Factory.PairCreated.handler(async ({ event, context }) => {
  // Handle event...
});
```

### Contract State (RPC Calls)

**TheGraph:**
```typescript
let contract = ERC20.bind(address);
let name = contract.name();
```

**HyperIndex (use Effect API):**
```typescript
import { createEffect, S } from "envio";

export const getTokenName = createEffect({
  name: "getTokenName",
  input: S.string,
  output: S.string,
  cache: true,
}, async ({ input: address }) => {
  // Use viem for RPC calls
  const name = await client.readContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "name",
  });
  return name;
});

// In handler
const name = await context.effect(getTokenName, address);
```

## Common Migration Issues

### Missing async/await

```typescript
// WRONG - returns {} instead of entity
const token = context.Token.get(id);

// CORRECT
const token = await context.Token.get(id);
```

### Field Selection for Transaction Data

```yaml
# Add to config.yaml for event.transaction.hash access
events:
  - event: Transfer(...)
    field_selection:
      transaction_fields:
        - hash
```

### Multichain ID Prefixes

```typescript
// Always prefix with chainId for multichain
const id = `${event.chainId}-${originalId}`;
```

### BigDecimal Precision

Maintain precision from original subgraph:

```typescript
import { BigDecimal } from "generated";

const ZERO_BD = new BigDecimal(0);
const ONE_BD = new BigDecimal(1);

// Don't simplify to JavaScript numbers
```

## Migration Checklist

- [ ] Convert subgraph.yaml to config.yaml
- [ ] Remove @entity decorators from schema
- [ ] Change Bytes! to String!
- [ ] Use _id suffix for relationships
- [ ] Add @derivedFrom to all entity arrays
- [ ] Add async to all handlers
- [ ] Add await to all context.Entity.get() calls
- [ ] Use spread operator for entity updates
- [ ] Replace Template.create() with contractRegister
- [ ] Add field_selection for transaction data
- [ ] Prefix IDs with chainId for multichain
- [ ] Convert contract bindings to Effect API

## Additional Resources

### Reference Files

For detailed migration patterns:
- **`references/migration-patterns.md`** - Complete pattern reference
- **`references/common-mistakes.md`** - Pitfalls and solutions

### External Resources

- Full docs: https://docs.envio.dev/docs/HyperIndex-LLM/hyperindex-complete
- Migration guide: https://docs.envio.dev/docs/migration-guide
- Example indexers:
  - Uniswap v4: https://github.com/enviodev/uniswap-v4-indexer
  - Safe: https://github.com/enviodev/safe-analysis-indexer
