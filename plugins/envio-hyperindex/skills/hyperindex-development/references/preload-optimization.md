# Preload Optimization

> **Key concept:** Handlers run TWICE - first for preloading, then for execution.

Preload optimization is HyperIndex's flagship performance feature. It reduces database roundtrips from thousands to single digits by batching reads across events.

## Why Preload Exists

**The Problem:**
```typescript
// Without preload: 5,000 Transfer events = 10,000 DB calls
ERC20.Transfer.handler(async ({ event, context }) => {
  const sender = await context.Account.get(event.params.from);    // DB call 1
  const receiver = await context.Account.get(event.params.to);    // DB call 2
});
```

**With Preload:** All 5,000 events preload concurrently, batching identical entity types into single queries. Result: **10,000 calls → 2 calls**.

## How It Works

### Phase 1: Preload (Concurrent)
- All handlers run in parallel for the entire batch
- Database reads are batched and deduplicated
- Entity writes are SKIPPED
- `context.log` calls are SKIPPED
- Errors are silently caught (won't crash)

### Phase 2: Execution (Sequential)
- Handlers run one-by-one in on-chain order
- Reads come from in-memory cache (instant)
- Entity writes persist to database
- Logging works normally
- Errors will crash the indexer

## Configuration

```yaml
# config.yaml
preload_handlers: true  # Default since envio@2.27
```

## Checking Which Phase You're In

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // This runs in BOTH phases
  const account = await context.Account.get(event.params.user);

  if (context.isPreload) {
    // Preload phase only - skip heavy logic
    return;
  }

  // Execution phase only
  context.log.info("Processing...");
  // CPU-intensive operations
  // Side effects
});
```

## Optimize with Promise.all

Concurrent reads in preload = fewer batched queries:

```typescript
// GOOD: Concurrent reads
ERC20.Transfer.handler(async ({ event, context }) => {
  const [sender, receiver] = await Promise.all([
    context.Account.get(event.params.from),
    context.Account.get(event.params.to),
  ]);
  // ...
});

// LESS OPTIMAL: Sequential reads
ERC20.Transfer.handler(async ({ event, context }) => {
  const sender = await context.Account.get(event.params.from);
  const receiver = await context.Account.get(event.params.to);
  // ...
});
```

## Critical Footguns

### Never Call fetch() Directly

```typescript
// WRONG - fetch runs TWICE
MyContract.Event.handler(async ({ event, context }) => {
  const data = await fetch(`https://api.example.com/${event.params.id}`);
});

// CORRECT - Use Effect API
import { getMetadata } from "./effects";

MyContract.Event.handler(async ({ event, context }) => {
  const data = await context.effect(getMetadata, event.params.id);
});
```

### Never Use External APIs Without Effect API

Any external call (RPC, REST, GraphQL) must use the Effect API. See `effect-api.md` for details.

### Side Effects Run Twice

```typescript
// WRONG - Analytics call runs twice!
MyContract.Event.handler(async ({ event, context }) => {
  await sendToAnalytics(event);  // Called in preload AND execution
});

// CORRECT - Guard with isPreload
MyContract.Event.handler(async ({ event, context }) => {
  if (!context.isPreload) {
    await sendToAnalytics(event);  // Only runs once
  }
});
```

## When to Use context.isPreload

Use the `context.isPreload` check for:

1. **CPU-intensive operations** - Skip during preload
2. **Side effects that can't be rolled back** - Analytics, webhooks
3. **Logging** - Already skipped by default, but explicit if needed
4. **Operations that depend on previous events' writes**

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // ALWAYS runs (both phases) - data loading
  const [entity1, entity2] = await Promise.all([
    context.Entity1.get(event.params.id1),
    context.Entity2.get(event.params.id2),
  ]);

  // Early return after loading in preload phase
  if (context.isPreload) return;

  // ONLY execution phase - actual processing
  const result = expensiveCalculation(entity1, entity2);

  context.Entity1.set({
    ...entity1,
    processedValue: result,
  });
});
```

## Preload Behavior Summary

| Operation | Preload Phase | Execution Phase |
|-----------|---------------|-----------------|
| `context.Entity.get()` | Batched, cached | From cache |
| `context.Entity.set()` | Ignored | Persisted |
| `context.log.*()` | Ignored | Works |
| `context.effect()` | Batched, cached | From cache |
| Exceptions | Silently caught | Crash indexer |
| Direct `fetch()` | Runs (BAD!) | Runs again (BAD!) |

## Performance Impact Example

Indexing 100,000 Transfer events:

| Approach | DB Roundtrips | Time |
|----------|---------------|------|
| No preload | 200,000 | ~10 min |
| With preload (sequential reads) | 2 | ~5 sec |
| With preload + Promise.all | 1 | ~3 sec |

## Best Practices

1. **Place reads at handler start** - Maximize preload benefit
2. **Use Promise.all for multiple reads** - Reduce to single batch
3. **Use Effect API for ALL external calls** - Automatic batching/caching
4. **Skip non-essential logic with `context.isPreload`** - Faster preload
5. **Don't worry about "entity not found"** - Preload is optimistic; execution phase has correct data
