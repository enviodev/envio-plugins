# RPC as Data Source

Use RPC for unsupported networks or as fallback for HyperSync.

## When to Use RPC

- **Unsupported Networks** - Chains not yet on HyperSync
- **Private Chains** - Custom EVM networks
- **Fallback** - Backup when HyperSync unavailable

**Note:** HyperSync is 10-100x faster. Use it when available.

## Basic RPC Configuration

```yaml
networks:
  - id: 1
    rpc_config:
      url: https://eth-mainnet.your-provider.com
    start_block: 15000000
    contracts:
      - name: MyContract
        address: "0x1234..."
```

## Advanced RPC Options

```yaml
networks:
  - id: 1
    rpc_config:
      url: https://eth-mainnet.your-provider.com
      initial_block_interval: 10000  # Blocks per request
      backoff_multiplicative: 0.8    # Scale back after errors
      acceleration_additive: 2000    # Increase on success
      interval_ceiling: 10000        # Max blocks per request
      backoff_millis: 5000          # Wait after error (ms)
      query_timeout_millis: 20000   # Request timeout (ms)
    start_block: 15000000
```

| Parameter | Description | Recommended |
|-----------|-------------|-------------|
| `initial_block_interval` | Starting batch size | 1,000-10,000 |
| `backoff_multiplicative` | Reduce batch on error | 0.5-0.9 |
| `acceleration_additive` | Increase batch on success | 500-2,000 |
| `interval_ceiling` | Max batch size | 5,000-10,000 |
| `backoff_millis` | Wait after error | 1,000-10,000ms |
| `query_timeout_millis` | Request timeout | 10,000-30,000ms |

## RPC Fallback for HyperSync

Add fallback RPC when HyperSync has issues:

```yaml
networks:
  - id: 137
    # Primary: HyperSync (automatic)
    # Fallback: RPC
    rpc:
      - url: https://polygon-rpc.com
        for: fallback
      - url: https://backup-polygon-rpc.com
        for: fallback
        initial_block_interval: 1000
    start_block: 0
    contracts:
      - name: MyContract
        address: 0x...
```

**Simple fallback:**
```yaml
networks:
  - id: 137
    rpc: https://polygon-rpc.com?API_KEY={POLYGON_API_KEY}
```

Fallback activates when no new block received for 20+ seconds.

## eRPC for Enhanced Reliability

Use [eRPC](https://github.com/erpc/erpc) for production deployments:

**Features:**
- Permanent caching
- Auto failover between providers
- Re-org awareness
- Auto-batching
- Load balancing

**erpc.yaml:**
```yaml
logLevel: debug
projects:
  - id: main
    upstreams:
      - endpoint: evm+envio://rpc.hypersync.xyz  # HyperRPC primary
      - endpoint: https://eth-mainnet-provider1.com
      - endpoint: https://eth-mainnet-provider2.com
```

**Run eRPC:**
```bash
docker run -v $(pwd)/erpc.yaml:/root/erpc.yaml \
  -p 4000:4000 -p 4001:4001 \
  ghcr.io/erpc/erpc:latest
```

**Use in config.yaml:**
```yaml
networks:
  - id: 1
    rpc_config:
      url: http://erpc:4000/main/evm/1
    start_block: 15000000
```

## Environment Variables

Use env vars for API keys:

```yaml
rpc: https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}
```

Set in `.env`:
```
ALCHEMY_API_KEY=your-key-here
```

## Best Practices

1. **Use HyperSync when available** - Much faster
2. **Start from recent blocks** - Faster initial sync
3. **Tune batch parameters** - Based on provider limits
4. **Use paid RPC services** - Better reliability
5. **Configure fallback** - For production deployments
6. **Consider eRPC** - For complex multi-provider setups

## Comparison: HyperSync vs RPC

| Feature | HyperSync | RPC |
|---------|-----------|-----|
| Speed | 10-100x faster | Baseline |
| Configuration | Minimal | Requires tuning |
| Rate Limits | None | Provider-dependent |
| Cost | Included | Pay per request |
| Networks | Supported networks only | Any EVM |
| Maintenance | Managed | Self-managed |
