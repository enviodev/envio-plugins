# Multichain Indexing

Index contracts across multiple blockchain networks in a single indexer.

## Config Structure

Define contracts globally, addresses per network:

```yaml
# Global contract definitions
contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: PairCreated(address indexed token0, address indexed token1, address pair)

  - name: Pair
    handler: src/pair.ts
    events:
      - event: Swap(...)

# Network-specific addresses
networks:
  - id: 1  # Ethereum
    start_block: 10000835
    contracts:
      - name: Factory
        address: 0xEthereumFactoryAddress

  - id: 10  # Optimism
    start_block: 1234567
    contracts:
      - name: Factory
        address: 0xOptimismFactoryAddress

  - id: 137  # Polygon
    start_block: 9876543
    contracts:
      - name: Factory
        address: 0xPolygonFactoryAddress
```

## Entity ID Namespacing

**Critical:** Always prefix IDs with chainId to avoid collisions:

```typescript
// CORRECT - Unique across chains
const id = `${event.chainId}-${event.params.tokenId}`;
const pairId = `${event.chainId}-${event.srcAddress}`;

// WRONG - Collision between chains
const id = event.params.tokenId.toString();
```

## Multichain Modes

### Unordered Mode (Recommended)

Process events as soon as available from each chain:

```yaml
unordered_multichain_mode: true
```

**Benefits:**
- Better performance
- Lower latency
- Each chain processes independently

**When to use:**
- Operations are commutative (order doesn't matter)
- Entities from different networks don't interact
- Processing speed more important than cross-chain ordering

### Ordered Mode (Default)

Strict deterministic ordering across all chains:

```yaml
# Default - no flag needed (will change to unordered in future)
```

**When to use:**
- Bridge applications requiring deposit-before-withdrawal ordering
- Cross-chain governance
- Multi-chain financial applications requiring exact sequence
- Data consistency systems

**Tradeoffs:**
- Higher latency (waits for slowest chain)
- Processing speed limited by slowest block time
- Guaranteed deterministic results

## Handler Patterns

Access chainId in handlers:

```typescript
Factory.PairCreated.handler(async ({ event, context }) => {
  // Use chainId for unique IDs
  const pairId = `${event.chainId}-${event.params.pair}`;
  const token0Id = `${event.chainId}-${event.params.token0}`;
  const token1Id = `${event.chainId}-${event.params.token1}`;

  context.Pair.set({
    id: pairId,
    chainId: event.chainId,
    token0_id: token0Id,
    token1_id: token1Id,
    address: event.params.pair,
  });
});
```

## Schema for Multichain

Include chainId in entities when needed:

```graphql
type Pair {
  id: ID!  # chainId-address format
  chainId: Int!
  address: String!
  token0_id: String!
  token1_id: String!
}

type Token {
  id: ID!  # chainId-address format
  chainId: Int!
  address: String!
  symbol: String!
}
```

## Best Practices

1. **ID Namespacing** - Always include chainId in entity IDs
2. **Error Handling** - Failures on one chain shouldn't stop others
3. **Use Unordered Mode** - Unless cross-chain ordering is critical
4. **Monitor Resources** - Multiple chains increase load
5. **Test All Networks** - Verify handlers work on each chain

## Troubleshooting

**Different Network Speeds:**
- Use unordered mode to prevent bottlenecks

**Entity Conflicts:**
- Verify IDs are properly namespaced with chainId

**Memory Usage:**
- Optimize entity structure
- Implement pagination in queries

## Example: Multichain DEX

```yaml
name: multichain-dex
unordered_multichain_mode: true

contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: PairCreated(address indexed token0, address indexed token1, address pair)

  - name: Pair
    handler: src/pair.ts
    events:
      - event: Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)

networks:
  - id: 1
    start_block: 10000835
    contracts:
      - name: Factory
        address: 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
  - id: 10
    start_block: 1234567
    contracts:
      - name: Factory
        address: 0xOptimismFactory
  - id: 8453
    start_block: 1234567
    contracts:
      - name: Factory
        address: 0xBaseFactory
```
