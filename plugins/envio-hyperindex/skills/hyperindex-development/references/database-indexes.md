# Database Indexes & Query Optimization

Optimize query performance with strategic indexing.

## Why Indexes Matter

| Data Size | Without Indexes | With Indexes |
|-----------|-----------------|--------------|
| 1,000 rows | ~10ms | ~1ms |
| 100,000 rows | ~500ms | ~2ms |
| 1,000,000+ rows | 5+ seconds | ~5ms |

## Single-Column Indexes

Use `@index` directive on frequently queried fields:

```graphql
type Transaction {
  id: ID!
  userAddress: String! @index
  tokenAddress: String! @index
  amount: BigInt!
  timestamp: BigInt! @index
}
```

**Use when:**
- Frequently filter by a field
- Sort results by a field
- Field has many different values (high cardinality)

## Composite Indexes

For multi-field queries, use entity-level `@index`:

```graphql
type Transfer @index(fields: ["from", "to", "tokenId"]) {
  id: ID!
  from: String! @index
  to: String! @index
  tokenId: BigInt!
  value: BigInt!
  timestamp: BigInt!
}
```

Creates:
1. Individual indexes on `from` and `to`
2. Composite index on `from + to + tokenId`

**Use when:**
- Query multiple fields together
- "Find transfers from X to Y for token Z"

## Multiple Composite Indexes

```graphql
type NFTListing
  @index(fields: ["collection", "status", "price"])
  @index(fields: ["seller", "status"]) {
  id: ID!
  collection: String! @index
  tokenId: BigInt!
  seller: String! @index
  price: BigInt!
  status: String! @index  # "active", "sold", "cancelled"
  createdAt: BigInt! @index
}
```

Supports:
- Active listings for collection, sorted by price
- Listings by seller with status
- Recently created listings

## Automatic Indexes

HyperIndex auto-indexes:
- All `ID` fields
- All `@derivedFrom` fields

No manual indexing needed for these.

## Common Index Patterns

### Token Transfers

```graphql
type TokenTransfer {
  id: ID!
  token_id: String! @index
  from: String! @index
  to: String! @index
  amount: BigInt!
  blockNumber: BigInt! @index
  timestamp: BigInt! @index
}
```

### DEX Swaps

```graphql
type Swap @index(fields: ["pair", "timestamp"]) {
  id: ID!
  pair_id: String! @index
  sender: String! @index
  amountIn: BigInt!
  amountOut: BigInt!
  timestamp: BigInt! @index
}
```

### User Activity

```graphql
type UserAction @index(fields: ["user", "actionType", "timestamp"]) {
  id: ID!
  user: String! @index
  actionType: String! @index
  timestamp: BigInt! @index
  amount: BigInt!
}
```

## Performance Tradeoffs

### Write Impact

| Index Level | Write Slowdown | Read Speed |
|-------------|----------------|------------|
| No indexes | Baseline | Slowest |
| Few targeted | 5-10% | Fast |
| Many indexes | 15%+ | Fastest |

Blockchain data is read-heavy - indexes usually worth it.

### Storage

- Each index: 2-10 bytes per row
- Consider for very large tables (millions+ rows)

## Query Optimization Tips

### Fetch Only What You Need

```graphql
# Good
query {
  Transfer(where: { token: { _eq: "0x123" } }, limit: 10) {
    id
    amount
  }
}

# Bad - unnecessary fields
query {
  Transfer(where: { token: { _eq: "0x123" } }, limit: 10) {
    id
    from
    to
    amount
    timestamp
    blockNumber
    transactionHash
    # ... more fields
  }
}
```

### Always Paginate

```graphql
query {
  Transfer(
    where: { token: { _eq: "0x123" } }
    limit: 20
    offset: 40  # Page 3
  ) {
    id
    amount
  }
}
```

### Filter on Indexed Fields

```graphql
# Fast - userAddress is indexed
query {
  Transaction(where: { userAddress: { _eq: "0x..." } }) { ... }
}

# Slow - amount is not indexed
query {
  Transaction(where: { amount: { _gt: "1000" } }) { ... }
}
```

## Index Checklist

When designing schema:

- [ ] Index fields used in `where` clauses
- [ ] Index fields used in `order_by`
- [ ] Add composite indexes for multi-field queries
- [ ] Consider cardinality (high variety = good index candidate)
- [ ] Don't over-index write-heavy entities
- [ ] Test query performance with realistic data volumes
