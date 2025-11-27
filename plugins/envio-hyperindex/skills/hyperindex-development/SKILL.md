---
name: HyperIndex Development
description: This skill should be used when the user asks to "create an indexer", "build a hyperindex", "index blockchain events", "write event handlers", "configure config.yaml", "define schema.graphql", "use envio", "set up hyperindex", "index smart contract events", "create graphql schema for blockchain data", or mentions Envio, HyperIndex, blockchain indexing, or event handler development.
version: 1.0.0
---

# HyperIndex Development

HyperIndex is Envio's blazing-fast, developer-friendly multichain blockchain indexer. It transforms on-chain events into structured, queryable databases with GraphQL APIs.

## Quick Start

Initialize a new indexer:

```bash
pnpx envio init
```

Run locally:

```bash
pnpm dev
```

## Essential Files

Every HyperIndex project contains three core files:

1. **`config.yaml`** - Defines networks, contracts, events to index
2. **`schema.graphql`** - Defines GraphQL entities for indexed data
3. **`src/EventHandlers.ts`** - Contains event processing logic

After changes to `config.yaml` or `schema.graphql`, run:

```bash
pnpm codegen
```

## Development Environment

**Requirements:**
- Node.js v20+ (v22 recommended)
- pnpm v8+
- Docker Desktop (for local development)

**Key commands:**
- `pnpm codegen` - Generate types after config/schema changes
- `pnpm tsc --noEmit` - Type-check TypeScript
- `TUI_OFF=true pnpm dev` - Run indexer with visible output

## Configuration (config.yaml)

Basic structure:

```yaml
# yaml-language-server: $schema=./node_modules/envio/evm.schema.json
name: my-indexer
networks:
  - id: 1  # Ethereum mainnet
    start_block: 0  # HyperSync is fast - start from genesis
    contracts:
      - name: MyContract
        address: 0xContractAddress
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
```

**Key options:**
- `address` - Single or array of addresses
- `start_block` - Block to begin indexing. **Use `0` with HyperSync** (default) - it's extremely fast and syncs millions of blocks in minutes. Only specify a later block if using RPC on unsupported networks.
- `handler` - Path to event handler file
- `events` - Event signatures to index

**For transaction/block data access**, use `field_selection`. By default, `event.transaction` is `{}` (empty).

**Per-event (recommended)** - Only fetch extra fields for events that need them. More fields = more data transfer = slower indexing:

```yaml
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)
    field_selection:
      transaction_fields:
        - hash
  - event: Approval(address indexed owner, address indexed spender, uint256 value)
    # No field_selection - this event doesn't need transaction data
```

**Global** - Applies to ALL events. Use only when most/all events need the same fields:

```yaml
field_selection:
  transaction_fields:
    - hash
```

**Available fields:**
- `transaction_fields`: `hash`, `from`, `to`, `value`, `gasPrice`, `gas`, `input`, `nonce`, `transactionIndex`, `gasUsed`, `status`, etc.
- `block_fields`: `miner`, `gasLimit`, `gasUsed`, `baseFeePerGas`, `size`, `difficulty`, etc.

**For dynamic contracts** (factory pattern), omit address and use contractRegister.

## Schema (schema.graphql)

Define entities without `@entity` decorator:

```graphql
type Token {
  id: ID!
  name: String!
  symbol: String!
  decimals: BigInt!
  totalSupply: BigInt!
}

type Transfer {
  id: ID!
  from: String!
  to: String!
  amount: BigInt!
  token_id: String!  # Relationship via _id suffix
  blockNumber: BigInt!
  timestamp: BigInt!
}
```

**Key rules:**
- Use `String!` instead of `Bytes!`
- Use `_id` suffix for relationships (e.g., `token_id` not `token`)
- Entity arrays require `@derivedFrom`: `transfers: [Transfer!]! @derivedFrom(field: "token")`
- No `@entity` decorators needed

## Event Handlers

Basic handler pattern:

```typescript
import { MyContract } from "generated";

MyContract.Transfer.handler(async ({ event, context }) => {
  const entity = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
  };

  context.Transfer.set(entity);
});
```

**Entity updates** - Use spread operator (entities are immutable):

```typescript
const existing = await context.Token.get(tokenId);
if (existing) {
  context.Token.set({
    ...existing,
    totalSupply: newSupply,
  });
}
```

**Dynamic contract registration** (factory pattern):

```typescript
Factory.PairCreated.contractRegister(({ event, context }) => {
  context.addPair(event.params.pair);
});

Factory.PairCreated.handler(async ({ event, context }) => {
  // Handle the event...
});
```

## Effect API for External Calls

When using `preload_handlers: true`, external calls MUST use the Effect API:

```typescript
import { S, createEffect } from "envio";

export const getTokenMetadata = createEffect({
  name: "getTokenMetadata",
  input: S.string,
  output: S.object({
    name: S.string,
    symbol: S.string,
    decimals: S.number,
  }),
  cache: true,
}, async ({ input: address }) => {
  // Fetch token metadata via RPC
  return { name: "Token", symbol: "TKN", decimals: 18 };
});

// In handler:
MyContract.Event.handler(async ({ event, context }) => {
  const metadata = await context.effect(getTokenMetadata, event.params.token);
});
```

## Common Patterns

**Multichain IDs** - Prefix with chainId:
```typescript
const id = `${event.chainId}-${event.params.tokenId}`;
```

**Timestamps** - Always cast to BigInt:
```typescript
timestamp: BigInt(event.block.timestamp)
```

**Address consistency** - Use lowercase:
```typescript
const address = event.params.token.toLowerCase();
```

**BigDecimal precision** - Import from generated:
```typescript
import { BigDecimal } from "generated";
const ZERO_BD = new BigDecimal(0);
```

## Debugging

Run with visible output:
```bash
TUI_OFF=true pnpm dev
```

Check for common issues:
- Missing `await` on `context.Entity.get()`
- Wrong field names (check generated types)
- Missing `field_selection` for transaction data

## Block Handlers

Index data on every block (or interval) without specific events:

```typescript
import { Ethereum } from "generated";

Ethereum.onBlock(
  async ({ block, context }) => {
    context.BlockStats.set({
      id: `${block.number}`,
      number: BigInt(block.number),
      timestamp: BigInt(block.timestamp),
      gasUsed: block.gasUsed,
    });
  },
  { interval: 100 }  // Every 100 blocks
);
```

See `references/block-handlers.md` for intervals, multichain, and preset handlers.

## Multichain Indexing

Index the same contract across multiple chains:

```yaml
networks:
  - id: 1       # Ethereum
    start_block: 0
    contracts:
      - name: MyToken
        address: 0x...
  - id: 137     # Polygon
    start_block: 0
    contracts:
      - name: MyToken
        address: 0x...
```

**Important:** Use chain-prefixed IDs to prevent collisions:
```typescript
const id = `${event.chainId}_${event.params.tokenId}`;
```

See `references/multichain-indexing.md` for ordered vs unordered mode.

## Wildcard Indexing

Index events across all contracts (no address specified):

```typescript
ERC20.Transfer.handler(
  async ({ event, context }) => {
    context.Transfer.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      token: event.srcAddress,  // The actual contract
      from: event.params.from,
      to: event.params.to,
    });
  },
  { wildcard: true }
);
```

See `references/wildcard-indexing.md` for topic filtering.

## Testing

Unit test handlers with MockDb:

```typescript
import { TestHelpers } from "generated";
const { MockDb, MyContract, Addresses } = TestHelpers;

it("creates entity on event", async () => {
  const mockDb = MockDb.createMockDb();
  const event = MyContract.Transfer.createMockEvent({
    from: Addresses.defaultAddress,
    to: "0x456...",
    value: BigInt(1000),
  });

  const updatedDb = await mockDb.processEvents([event]);
  const transfer = updatedDb.entities.Transfer.get("...");
  assert.ok(transfer);
});
```

See `references/testing.md` for complete patterns.

## Querying Data

Access indexed data via GraphQL at `http://localhost:8080`:

```graphql
query {
  Transfer(where: { from: { _eq: "0x123..." } }, limit: 100) {
    id
    from
    to
    amount
  }
}
```

Check indexing progress with `_meta`:
```graphql
{
  _meta {
    chainId
    progressBlock
    isReady
  }
}
```

See `references/graphql-querying.md` for query patterns.

## Database Indexes

Optimize query performance with `@index`:

```graphql
type Transfer {
  id: ID!
  from: String! @index
  to: String! @index
  timestamp: BigInt! @index
}

type Swap @index(fields: ["pair", "timestamp"]) {
  id: ID!
  pair_id: String! @index
  timestamp: BigInt!
}
```

See `references/database-indexes.md` for optimization tips.

## Additional Resources

### Reference Files

For detailed patterns and advanced techniques, consult:

**Core Concepts:**
- **`references/config-options.md`** - Complete config.yaml options
- **`references/effect-api.md`** - External calls and RPC patterns
- **`references/entity-patterns.md`** - Entity relationships and updates

**Advanced Features:**
- **`references/block-handlers.md`** - Block-level indexing with intervals
- **`references/multichain-indexing.md`** - Ordered vs unordered mode
- **`references/wildcard-indexing.md`** - Topic filtering, dynamic contracts
- **`references/rpc-data-source.md`** - RPC config and fallback

**Operations:**
- **`references/graphql-querying.md`** - Hasura console and query patterns
- **`references/database-indexes.md`** - Index optimization
- **`references/testing.md`** - MockDb and test patterns

### Example Files

Working examples in `examples/`:
- **`examples/basic-handler.ts`** - Simple event handler
- **`examples/factory-pattern.ts`** - Dynamic contract registration

### External Documentation

- Full docs: https://docs.envio.dev/docs/HyperIndex-LLM/hyperindex-complete
- Example indexers:
  - Uniswap v4: https://github.com/enviodev/uniswap-v4-indexer
  - Safe: https://github.com/enviodev/safe-analysis-indexer
