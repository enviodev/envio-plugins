# GraphQL Querying & Hasura

Query indexed data via GraphQL at localhost:8080.

## Accessing Hasura Console

When running locally:
```
http://localhost:8080
```

**Password:** `testing`

## Basic Queries

### Query Entities

```graphql
query {
  User(limit: 10) {
    id
    address
    balance
  }
}
```

### With Filters

```graphql
query {
  Transfer(where: { from: { _eq: "0x123..." } }, limit: 100) {
    id
    from
    to
    amount
    blockNumber
  }
}
```

### Ordering and Pagination

```graphql
query {
  Token(
    order_by: { totalSupply: desc }
    limit: 20
    offset: 40  # Page 3 with 20 items
  ) {
    id
    symbol
    totalSupply
  }
}
```

## Metadata Query

Check indexing progress with `_meta` (v2.28+):

```graphql
{
  _meta {
    chainId
    progressBlock
    eventsProcessed
    bufferBlock
    sourceBlock
    isReady
    readyAt
    startBlock
    endBlock
  }
}
```

**Response:**
```json
{
  "data": {
    "_meta": [
      {
        "chainId": 1,
        "progressBlock": 22817138,
        "eventsProcessed": 2380000,
        "isReady": false,
        "sourceBlock": 23368264
      }
    ]
  }
}
```

### Per-Chain Metadata

```graphql
{
  _meta(where: { chainId: { _eq: 1 } }) {
    progressBlock
    isReady
  }
}
```

**Fields:**
- `progressBlock` - Last fully processed block
- `eventsProcessed` - Total events processed
- `bufferBlock` - Latest event ready for processing
- `sourceBlock` - Latest known block from data source
- `isReady` - Historical sync complete?
- `readyAt` - Timestamp when historical sync finished

## Common Query Patterns

### Recent Transfers for User

```graphql
query UserTransfers($address: String!) {
  Transfer(
    where: {
      _or: [
        { from: { _eq: $address } },
        { to: { _eq: $address } }
      ]
    }
    order_by: { blockTimestamp: desc }
    limit: 50
  ) {
    id
    from
    to
    amount
    blockTimestamp
  }
}
```

### Token Stats

```graphql
query TokenStats($tokenId: String!) {
  Token(where: { id: { _eq: $tokenId } }) {
    id
    symbol
    name
    totalSupply
    holderCount
  }
}
```

### Polling for Updates

```graphql
query NewTransfers($lastTimestamp: BigInt!) {
  Transfer(where: { blockTimestamp: { _gt: $lastTimestamp } }) {
    id
    from
    to
    amount
    blockTimestamp
  }
}
```

## Hasura Console Tabs

### API Tab
- Execute GraphQL queries
- Explorer shows all entities
- Test queries before frontend integration

### Data Tab
- View database tables directly
- Check `db_write_timestamp` for freshness
- Manually inspect entities

## Aggregations Warning

**Local:** Aggregation queries (count, sum) work in Hasura console.

**Hosted Service:** Aggregations are **disabled** due to performance.

**Best Practice:** Compute aggregates at indexing time:

```graphql
# Schema
type GlobalStats {
  id: ID!
  totalTransfers: Int!
  totalVolume: BigDecimal!
}
```

```typescript
// Handler - update on each transfer
const stats = await context.GlobalStats.get("global");
context.GlobalStats.set({
  ...stats,
  totalTransfers: stats.totalTransfers + 1,
  totalVolume: stats.totalVolume.plus(transferAmount),
});
```

Then query precomputed values:
```graphql
{
  GlobalStats(where: { id: { _eq: "global" } }) {
    totalTransfers
    totalVolume
  }
}
```

## GraphQL Endpoint

**Local:**
```
http://localhost:8080/v1/graphql
```

**Fetch example:**
```typescript
const response = await fetch('http://localhost:8080/v1/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        Token(limit: 10) {
          id
          symbol
        }
      }
    `
  })
});

const data = await response.json();
```

## Best Practices

1. **Fetch only needed fields** - Reduces response size
2. **Use pagination** - Never query unlimited results
3. **Use indexed fields** - Filter on `@index` columns
4. **Poll with timestamps** - Fetch only new data
5. **Precompute aggregates** - At indexing time, not query time
6. **Check _meta** - Verify indexer is caught up before queries
