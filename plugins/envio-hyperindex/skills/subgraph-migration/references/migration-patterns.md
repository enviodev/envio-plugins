# Complete Migration Patterns Reference

Comprehensive patterns for migrating from TheGraph subgraphs to HyperIndex.

## File Structure Migration

### Subgraph Structure

```
subgraph/
├── subgraph.yaml
├── schema.graphql
├── abis/
│   └── Contract.json
└── src/
    ├── mapping.ts
    └── utils/
        └── helpers.ts
```

### HyperIndex Structure

```
hyperindex/
├── config.yaml
├── schema.graphql
├── abis/
│   └── Contract.json
└── src/
    ├── EventHandlers.ts  # or split by contract
    ├── factory.ts
    ├── pair.ts
    └── utils/
        └── helpers.ts
```

## Config Migration Patterns

### Single Contract

**Subgraph:**
```yaml
dataSources:
  - kind: ethereum/contract
    name: MyContract
    network: mainnet
    source:
      address: "0x..."
      startBlock: 12345678
      abi: MyContract
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Entity1
        - Entity2
      abis:
        - name: MyContract
          file: ./abis/MyContract.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
```

**HyperIndex:**
```yaml
name: my-indexer
networks:
  - id: 1
    start_block: 12345678
    contracts:
      - name: MyContract
        address: 0x...
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
```

### Multichain Configuration

**HyperIndex multichain:**
```yaml
name: multichain-indexer
unordered_multichain_mode: true

# Global contract definitions
contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: PairCreated(address indexed token0, address indexed token1, address pair)

networks:
  - id: 1  # Ethereum
    start_block: 10000835
    contracts:
      - name: Factory
        address: 0xEthereumFactory

  - id: 10  # Optimism
    start_block: 1234567
    contracts:
      - name: Factory
        address: 0xOptimismFactory

  - id: 137  # Polygon
    start_block: 9876543
    contracts:
      - name: Factory
        address: 0xPolygonFactory
```

**Key:** Define handlers/events globally, addresses per network.

### Dynamic Contracts (Templates)

**Subgraph templates:**
```yaml
templates:
  - kind: ethereum/contract
    name: Pair
    network: mainnet
    source:
      abi: Pair
    mapping:
      eventHandlers:
        - event: Swap(...)
          handler: handleSwap
```

**HyperIndex:**
```yaml
contracts:
  # Factory has address
  - name: Factory
    address: 0xFactoryAddress
    handler: src/factory.ts
    events:
      - event: PairCreated(...)

  # Pair has NO address - registered dynamically
  - name: Pair
    handler: src/pair.ts
    events:
      - event: Swap(...)
      - event: Mint(...)
      - event: Burn(...)
      - event: Sync(...)
```

## Schema Migration Patterns

### Type Conversions

| TheGraph | HyperIndex |
|----------|------------|
| `Bytes!` | `String!` |
| `BigInt!` | `BigInt!` |
| `BigDecimal!` | `BigDecimal!` |
| `Int!` | `Int!` |
| `ID!` | `ID!` |
| `Boolean!` | `Boolean!` |

### Entity Decorator

```graphql
# TheGraph
type Token @entity {
  id: ID!
}

# HyperIndex - remove @entity
type Token {
  id: ID!
}
```

### Immutable Entities

```graphql
# TheGraph
type Transfer @entity(immutable: true) {
  id: ID!
}

# HyperIndex - just remove decorator
type Transfer {
  id: ID!
}
```

### Entity Relationships

**Direct reference → _id field:**

```graphql
# TheGraph
type Transfer @entity {
  token: Token!
}

# HyperIndex
type Transfer {
  token_id: String!  # Reference by ID
}
```

**Arrays must have @derivedFrom:**

```graphql
# HyperIndex - REQUIRED
type Token {
  id: ID!
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type Transfer {
  id: ID!
  token_id: String!  # Field referenced by @derivedFrom
}
```

### Complete Schema Example

**TheGraph:**
```graphql
type Factory @entity {
  id: ID!
  pairCount: BigInt!
  pairs: [Pair!]! @derivedFrom(field: "factory")
}

type Token @entity {
  id: ID!
  symbol: String!
  name: String!
  decimals: BigInt!
}

type Pair @entity {
  id: ID!
  factory: Factory!
  token0: Token!
  token1: Token!
  reserve0: BigDecimal!
  reserve1: BigDecimal!
  swaps: [Swap!]! @derivedFrom(field: "pair")
}

type Swap @entity(immutable: true) {
  id: ID!
  pair: Pair!
  sender: Bytes!
  amount0In: BigDecimal!
  amount1In: BigDecimal!
  timestamp: BigInt!
  transaction: Bytes!
}
```

**HyperIndex:**
```graphql
type Factory {
  id: ID!
  pairCount: BigInt!
  pairs: [Pair!]! @derivedFrom(field: "factory")
}

type Token {
  id: ID!
  symbol: String!
  name: String!
  decimals: BigInt!
}

type Pair {
  id: ID!
  factory_id: String!
  token0_id: String!
  token1_id: String!
  reserve0: BigDecimal!
  reserve1: BigDecimal!
  swaps: [Swap!]! @derivedFrom(field: "pair")
}

type Swap {
  id: ID!
  pair_id: String!
  sender: String!
  amount0In: BigDecimal!
  amount1In: BigDecimal!
  timestamp: BigInt!
  transactionHash: String!
}
```

## Handler Migration Patterns

### Basic Handler

**TheGraph:**
```typescript
export function handleTransfer(event: TransferEvent): void {
  let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let transfer = new Transfer(id);

  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;

  transfer.save();
}
```

**HyperIndex:**
```typescript
import { MyContract } from "generated";

MyContract.Transfer.handler(async ({ event, context }) => {
  const id = `${event.chainId}-${event.transaction.hash}-${event.logIndex}`;

  const transfer = {
    id,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
  };

  context.Transfer.set(transfer);
});
```

### Entity Loading and Updates

**TheGraph:**
```typescript
export function handleApproval(event: ApprovalEvent): void {
  let token = Token.load(event.address.toHexString());

  if (token == null) {
    token = new Token(event.address.toHexString());
    token.symbol = "UNKNOWN";
    token.name = "Unknown Token";
    token.decimals = BigInt.fromI32(18);
    token.totalSupply = BigInt.fromI32(0);
  }

  token.approvalCount = token.approvalCount.plus(BigInt.fromI32(1));
  token.save();
}
```

**HyperIndex:**
```typescript
MyContract.Approval.handler(async ({ event, context }) => {
  const tokenId = `${event.chainId}-${event.srcAddress}`;
  let token = await context.Token.get(tokenId);

  if (!token) {
    token = {
      id: tokenId,
      symbol: "UNKNOWN",
      name: "Unknown Token",
      decimals: BigInt(18),
      totalSupply: BigInt(0),
      approvalCount: BigInt(0),
    };
  }

  // Use spread operator - entities are immutable
  context.Token.set({
    ...token,
    approvalCount: token.approvalCount + BigInt(1),
  });
});
```

### Dynamic Contract Registration

**TheGraph:**
```typescript
import { Pair as PairTemplate } from "../generated/templates";

export function handlePairCreated(event: PairCreatedEvent): void {
  // Create template instance
  PairTemplate.create(event.params.pair);

  // Create Pair entity
  let pair = new Pair(event.params.pair.toHexString());
  pair.token0 = event.params.token0.toHexString();
  pair.token1 = event.params.token1.toHexString();
  pair.save();
}
```

**HyperIndex:**
```typescript
import { Factory, Pair } from "generated";

// Register contract BEFORE handler
Factory.PairCreated.contractRegister(({ event, context }) => {
  context.addPair(event.params.pair);  // Method name: add{ContractName}
});

Factory.PairCreated.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.params.pair}`;

  const pair = {
    id: pairId,
    token0_id: `${event.chainId}-${event.params.token0}`,
    token1_id: `${event.chainId}-${event.params.token1}`,
    reserve0: BigInt(0),
    reserve1: BigInt(0),
  };

  context.Pair.set(pair);
});
```

## BigDecimal Handling

Maintain precision from original subgraph:

```typescript
import { BigDecimal } from "generated";

// Constants
export const ZERO_BI = BigInt(0);
export const ONE_BI = BigInt(1);
export const ZERO_BD = new BigDecimal(0);
export const ONE_BD = new BigDecimal(1);
export const BI_18 = BigInt(18);

// Convert to decimal with proper precision
export function exponentToBigDecimal(decimals: bigint): BigDecimal {
  let bd = ONE_BD;
  for (let i = ZERO_BI; i < decimals; i = i + ONE_BI) {
    bd = bd.times(new BigDecimal(10));
  }
  return bd;
}

export function convertTokenToDecimal(
  tokenAmount: bigint,
  exchangeDecimals: bigint
): BigDecimal {
  if (exchangeDecimals === ZERO_BI) {
    return new BigDecimal(tokenAmount.toString());
  }
  return new BigDecimal(tokenAmount.toString()).div(
    exponentToBigDecimal(exchangeDecimals)
  );
}
```

## Effect API for RPC Calls

**TheGraph contract bindings:**
```typescript
import { ERC20 } from "../generated/templates/Pair/ERC20";

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_symbol();
  if (result.reverted) {
    return "UNKNOWN";
  }
  return result.value;
}
```

**HyperIndex Effect API:**
```typescript
import { createEffect, S } from "envio";
import { createPublicClient, http, parseAbi } from "viem";

const ERC20_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const client = createPublicClient({
  transport: http(process.env.RPC_URL),
});

export const fetchTokenSymbol = createEffect(
  {
    name: "fetchTokenSymbol",
    input: S.string,
    output: S.string,
    cache: true,
  },
  async ({ input: tokenAddress }) => {
    try {
      const symbol = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "symbol",
      });
      return symbol;
    } catch {
      return "UNKNOWN";
    }
  }
);

// Usage in handler
const symbol = await context.effect(fetchTokenSymbol, tokenAddress);
```

## Timestamp and Block Data

```typescript
// TheGraph
entity.timestamp = event.block.timestamp;
entity.blockNumber = event.block.number;

// HyperIndex - always cast to BigInt
entity.timestamp = BigInt(event.block.timestamp);
entity.blockNumber = BigInt(event.block.number);

// For day-based aggregations
const dayTimestamp = Math.floor(event.block.timestamp / 86400) * 86400;
const dayId = `${event.chainId}-${dayTimestamp}-${tokenAddress}`;
```

## Field Selection for Transaction Data

When handler needs `event.transaction.hash`:

```yaml
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)
    field_selection:
      transaction_fields:
        - hash
        - from  # optional
        - to    # optional
```

Without field_selection, `event.transaction` will be `{}`.

## Complete Handler Migration Example

**Original TheGraph handler:**
```typescript
import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { Swap as SwapEvent } from "../generated/templates/Pair/Pair";
import { Swap, Pair, Token, Factory } from "../generated/schema";
import { convertTokenToDecimal, ZERO_BD, ONE_BI } from "./helpers";

export function handleSwap(event: SwapEvent): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair === null) return;

  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);
  if (token0 === null || token1 === null) return;

  let amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals);
  let amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals);
  let amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals);
  let amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals);

  let swap = new Swap(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  swap.pair = pair.id;
  swap.sender = event.params.sender;
  swap.to = event.params.to;
  swap.amount0In = amount0In;
  swap.amount1In = amount1In;
  swap.amount0Out = amount0Out;
  swap.amount1Out = amount1Out;
  swap.timestamp = event.block.timestamp;
  swap.transaction = event.transaction.hash;
  swap.save();

  // Update pair
  pair.txCount = pair.txCount.plus(ONE_BI);
  pair.save();

  // Update factory
  let factory = Factory.load("1");
  if (factory !== null) {
    factory.txCount = factory.txCount.plus(ONE_BI);
    factory.save();
  }
}
```

**Migrated HyperIndex handler:**
```typescript
import { Pair } from "generated";
import { convertTokenToDecimal, ZERO_BD, ONE_BI } from "./utils/helpers";

Pair.Swap.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.srcAddress}`;
  const pair = await context.Pair.get(pairId);
  if (!pair) return;

  const token0 = await context.Token.get(pair.token0_id);
  const token1 = await context.Token.get(pair.token1_id);
  if (!token0 || !token1) return;

  const amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals);
  const amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals);
  const amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals);
  const amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals);

  const swap = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    pair_id: pairId,
    sender: event.params.sender,
    to: event.params.to,
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  context.Swap.set(swap);

  // Update pair - use spread operator
  context.Pair.set({
    ...pair,
    txCount: pair.txCount + ONE_BI,
  });

  // Update factory
  const factoryId = `${event.chainId}-factory`;
  const factory = await context.Factory.get(factoryId);
  if (factory) {
    context.Factory.set({
      ...factory,
      txCount: factory.txCount + ONE_BI,
    });
  }
});
```
