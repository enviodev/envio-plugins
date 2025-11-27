# Chain Reorganization (Reorg) Support

HyperIndex automatically handles chain reorganizations to keep your indexed data consistent with the blockchain's canonical state.

## What Are Reorgs?

Chain reorganizations occur when the blockchain temporarily forks and then resolves to a single chain. When this happens:

- Some previously confirmed blocks get replaced
- Transactions may be dropped or reordered
- Indexed data may no longer be valid

HyperIndex detects reorgs and automatically rolls back affected data.

## Configuration

### Enable/Disable (Default: Enabled)

```yaml
# config.yaml
rollback_on_reorg: true   # Default - recommended for production
```

### Confirmation Threshold

Configure how many blocks must pass before data is considered "final":

```yaml
# config.yaml
rollback_on_reorg: true
networks:
  - id: 1        # Ethereum
    confirmed_block_threshold: 250   # Higher for Ethereum mainnet

  - id: 137      # Polygon
    confirmed_block_threshold: 150   # Lower for faster chains

  - id: 42161    # Arbitrum
    # Uses default: 200 blocks
```

**Default threshold:** 200 blocks for all networks.

## What Gets Rolled Back

When a reorg is detected:

| Rolled Back | NOT Rolled Back |
|-------------|-----------------|
| All entity data | External API calls |
| Schema entities | Webhooks sent |
| Database writes | Logs written to files |
| | Analytics events |

## Example Configuration

```yaml
# Production config with reorg handling
name: my-indexer
rollback_on_reorg: true

networks:
  - id: 1          # Ethereum Mainnet
    confirmed_block_threshold: 250
    start_block: 18000000
    contracts:
      - name: MyContract
        address: "0x..."
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)

  - id: 10         # Optimism
    confirmed_block_threshold: 100   # Faster finality
    start_block: 100000000
    contracts:
      - name: MyContract
        address: "0x..."
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
```

## Best Practices

### 1. Keep Reorg Support Enabled

```yaml
rollback_on_reorg: true  # Always for production
```

Only disable for development/testing when you need faster iteration.

### 2. Use HyperSync for Guaranteed Detection

Reorg detection is **guaranteed** when using HyperSync (the default data source).

With custom RPC endpoints, edge cases may go undetected depending on the provider.

### 3. Avoid Non-Rollbackable Side Effects

```typescript
// BAD - Can't be rolled back if reorg happens
MyContract.Event.handler(async ({ event, context }) => {
  await sendWebhook(event);  // This stays even if block is reorged
  await postToAnalytics(event);
});

// BETTER - Use Effect API with caching
// Or guard side effects appropriately
MyContract.Event.handler(async ({ event, context }) => {
  // Entity writes ARE rolled back
  context.Transfer.set({
    id: `${event.chainId}_${event.transactionHash}_${event.logIndex}`,
    // ...
  });

  // For critical external calls, consider confirmation delay
  // or handle in a separate system that reads from your indexed data
});
```

### 4. Higher Thresholds for High-Value Apps

For financial applications or high-stakes data:

```yaml
networks:
  - id: 1
    confirmed_block_threshold: 300  # Extra conservative
```

### 5. Adjust Per Network

Different networks have different reorg characteristics:

| Network | Typical Reorg Depth | Recommended Threshold |
|---------|---------------------|----------------------|
| Ethereum | Rare, shallow | 200-300 |
| Polygon | More frequent | 150-200 |
| Arbitrum | Very rare (L2) | 100-150 |
| Optimism | Very rare (L2) | 100-150 |
| BSC | Occasional | 150-200 |

## Reorg Handling in Code

You generally don't need special code for reorgs - HyperIndex handles it automatically. However, be aware:

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // This entity write will be rolled back if the block is reorged
  context.Transfer.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.value,
    // Include block info for debugging
    blockNumber: BigInt(event.block.number),
    blockHash: event.block.hash,
  });
});
```

## Debugging Reorg Issues

If you suspect reorg-related data inconsistencies:

1. Check if `rollback_on_reorg: true` is set
2. Verify you're using HyperSync (not custom RPC)
3. Check block explorer for the affected block range
4. Look for "reorg detected" in indexer logs

## Summary

| Setting | Value | Use Case |
|---------|-------|----------|
| `rollback_on_reorg` | `true` | Production (default) |
| `rollback_on_reorg` | `false` | Dev/testing only |
| `confirmed_block_threshold` | 200 | Default for all networks |
| `confirmed_block_threshold` | 250-300 | High-value Ethereum apps |
| `confirmed_block_threshold` | 100-150 | L2s with fast finality |
