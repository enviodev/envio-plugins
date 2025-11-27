# GraphQL Querying

Query indexed data via GraphQL. Works locally during development or on hosted deployments.

**Local endpoint:** `http://localhost:8080/v1/graphql`
**Hasura Console:** `http://localhost:8080` (password: `testing`)

## Checking Indexing Progress

**Always check sync status first** before assuming data is missing.

### Using `_meta` (Recommended)

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { chainId startBlock progressBlock sourceBlock eventsProcessed isReady } }"}'
```

Or in GraphQL:
```graphql
{
  _meta {
    chainId
    startBlock
    progressBlock
    sourceBlock
    eventsProcessed
    isReady
    readyAt
  }
}
```

**Fields:**
- `progressBlock` - Last fully processed block
- `sourceBlock` - Latest known block from data source (target)
- `eventsProcessed` - Total events processed
- `isReady` - `true` when historical sync is complete
- `readyAt` - Timestamp when sync finished

**Example response:**
```json
{
  "_meta": [
    {
      "chainId": 1,
      "progressBlock": 22817138,
      "sourceBlock": 23368264,
      "eventsProcessed": 2380000,
      "isReady": false
    }
  ]
}
```

### Filter by Chain

```graphql
{
  _meta(where: { chainId: { _eq: 1 } }) {
    progressBlock
    isReady
  }
}
```

### Using `chain_metadata`

More detailed chain information:

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ chain_metadata { chain_id start_block latest_processed_block num_events_processed is_hyper_sync } }"}'
```

**Additional fields:**
- `is_hyper_sync` - Whether using HyperSync (fast) or RPC
- `latest_fetched_block_number` - Latest block fetched from source
- `num_batches_fetched` - Number of batches processed

## Basic Queries

### Query Entities

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Transfer(limit: 10) { id from to amount blockNumber } }"}'
```

### With Ordering

```graphql
{
  Transfer(order_by: { blockNumber: desc }, limit: 10) {
    id
    from
    to
    amount
  }
}
```

### With Filters

```graphql
{
  Transfer(where: { from: { _eq: "0x123..." } }, limit: 100) {
    id
    from
    to
    amount
  }
}
```

### Filter by Chain (Multichain)

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Transfer(where: {chainId: {_eq: 42161}}, limit: 10) { id chainId from to amount } }"}'
```

## Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `_eq` | Equals | `{field: {_eq: "value"}}` |
| `_neq` | Not equals | `{field: {_neq: "value"}}` |
| `_gt` | Greater than | `{amount: {_gt: "100"}}` |
| `_gte` | Greater than or equal | `{amount: {_gte: "100"}}` |
| `_lt` | Less than | `{amount: {_lt: "100"}}` |
| `_lte` | Less than or equal | `{amount: {_lte: "100"}}` |
| `_in` | In list | `{chainId: {_in: [1, 10]}}` |
| `_nin` | Not in list | `{chainId: {_nin: [1]}}` |
| `_is_null` | Is null | `{field: {_is_null: true}}` |
| `_like` | Pattern match | `{id: {_like: "1_%"}}` |
| `_ilike` | Case-insensitive pattern | `{user: {_ilike: "%abc%"}}` |

**Important:** BigInt values must be quoted strings: `{amount: {_gt: "1000000000000000000"}}`

## Logical Operators

```graphql
# AND - all conditions must match
where: { _and: [{ chainId: { _eq: 1 } }, { amount: { _gt: "0" } }] }

# OR - any condition matches
where: { _or: [{ from: { _eq: "0x123" } }, { to: { _eq: "0x123" } }] }

# NOT - negate condition
where: { _not: { amount: { _eq: "0" } } }
```

## Pagination

### Limit and Offset

```graphql
{
  Transfer(limit: 100, offset: 200) {
    id
  }
}
```

### Cursor-based (by primary key)

```graphql
{
  Transfer(limit: 100, where: { id: { _gt: "last_seen_id" } }, order_by: { id: asc }) {
    id
  }
}
```

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

### Get by Primary Key

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Transfer_by_pk(id: \"1_0xabc..._0\") { id from to amount } }"}'
```

## Discovering Schema

### List All Query Types

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { fields { name } } } }"}'
```

### Get Entity Fields

```bash
curl -s http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __type(name: \"Transfer\") { fields { name type { name } } } }"}'
```

## Aggregations

**Local:** Aggregation queries work in Hasura console.

**Hosted Service:** Aggregations are **disabled** for performance.

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

## Hasura Console

Open `http://localhost:8080` for the visual interface.

**API Tab:**
- Execute GraphQL queries
- Explorer shows all entities
- Test queries before frontend integration

**Data Tab:**
- View database tables directly
- Check `db_write_timestamp` for freshness
- Manually inspect entities

## Fetch from Code

```typescript
const response = await fetch('http://localhost:8080/v1/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        Transfer(limit: 10) {
          id
          from
          to
          amount
        }
      }
    `
  })
});

const data = await response.json();
```

## Best Practices

1. **Check `_meta` first** - Verify indexer progress before assuming data is missing
2. **Fetch only needed fields** - Reduces response size
3. **Use pagination** - Never query unlimited results
4. **Filter on indexed fields** - Use `@index` columns for faster queries
5. **Poll with timestamps** - Fetch only new data for real-time updates
6. **Precompute aggregates** - At indexing time, not query time
7. **BigInt as strings** - Always quote large numbers in filters
