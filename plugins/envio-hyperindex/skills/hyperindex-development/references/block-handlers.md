# Block Handlers

Run logic on every block or at intervals using the `onBlock` API (v2.29+).

## Basic Usage

```typescript
import { onBlock } from "generated";

onBlock(
  {
    name: "MyBlockHandler",
    chain: 1,
  },
  async ({ block, context }) => {
    context.log.info(`Processing block ${block.number}`);
  }
);
```

**Note:** Block handlers don't require config changes or codegen runs.

## Options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Handler name for logging/metrics |
| `chain` | Yes | Chain ID to run on |
| `interval` | No | Block interval (default: 1 = every block) |
| `startBlock` | No | Block to start from |
| `endBlock` | No | Block to end at |

## Handler Function

**Important:** Block handlers require `preload_handlers: true` in config.yaml.

```typescript
onBlock(
  { name: "HourlyStats", chain: 1, interval: 300 },
  async ({ block, context }) => {
    // block.number - The block number
    // block.chainId - The chain ID
    // context - Same as event handlers
  }
);
```

## Time-Based Intervals

Convert time to blocks:

```typescript
// Every 60 minutes on Ethereum (12s blocks)
const interval = (60 * 60) / 12; // 300 blocks

// Every 60 minutes on Optimism (2s blocks)
const interval = (60 * 60) / 2; // 1800 blocks
```

## Multichain Block Handlers

Use `forEach` for multiple chains:

```typescript
import { onBlock } from "generated";

[
  { chain: 1 as const, startBlock: 19783636, interval: 300 },
  { chain: 10 as const, startBlock: 119534316, interval: 1800 },
].forEach(({ chain, startBlock, interval }) => {
  onBlock(
    { name: "HourlyPrice", chain, startBlock, interval },
    async ({ block, context }) => {
      // Handle block...
    }
  );
});
```

## Different Historical vs Realtime Intervals

Speed up historical sync with larger intervals:

```typescript
const realtimeBlock = 19783636;

// Historical: every 1000 blocks
onBlock(
  {
    name: "HistoricalHandler",
    chain: 1,
    endBlock: realtimeBlock - 1,
    interval: 1000,
  },
  async ({ block, context }) => { /* ... */ }
);

// Realtime: every block
onBlock(
  {
    name: "RealtimeHandler",
    chain: 1,
    startBlock: realtimeBlock,
    interval: 1,
  },
  async ({ block, context }) => { /* ... */ }
);
```

## Preset/Initial Data Handler

Load initial data on block 0:

```typescript
onBlock(
  {
    name: "Preset",
    chain: 1,
    startBlock: 0,
    endBlock: 0,
  },
  async ({ block, context }) => {
    // Skip preload phase for initial data
    if (context.isPreload) return;

    const users = await fetch("https://api.example.com/users");
    for (const user of users) {
      context.User.set({
        id: user.id,
        address: user.address,
        name: user.name,
      });
    }
  }
);
```

## Use Cases

- **Hourly/Daily aggregations** - Price snapshots, volume totals
- **Time-series data** - Create periodic data points
- **Initial state loading** - Populate entities on startup
- **State snapshots** - Capture state at intervals

## Limitations

- Requires `preload_handlers: true`
- Ordered multichain mode not supported
- Only EVM chains (no Fuel)
- No test framework support yet
- Only `block.number` and `block.chainId` available
