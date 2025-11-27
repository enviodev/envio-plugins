# Deployment

Deploy your indexer to Envio's hosted service for production-ready infrastructure without operational overhead.

## Hosted Service Overview

Envio's hosted service provides:

- **Git-based deployments** - Push to deploy (like Vercel)
- **Zero infrastructure management** - No servers to maintain
- **Static production endpoints** - Consistent URLs, zero-downtime deploys
- **Built-in monitoring** - Logs, sync status, deployment health
- **Alerting** - Discord, Slack, Telegram, Email notifications
- **GraphQL API** - Production-ready query endpoint
- **Multi-chain support** - Single codebase, multiple networks

## Pre-Deployment Checklist

Before deploying, verify your indexer works locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Generate types
pnpm codegen

# 3. Type check
pnpm tsc --noEmit

# 4. Run locally
pnpm dev

# 5. Test with TUI off to see all logs
TUI_OFF=true pnpm dev
```

### Verify:
- [ ] No TypeScript errors
- [ ] Entities are being created/updated
- [ ] No runtime errors in logs
- [ ] GraphQL queries return expected data (localhost:8080)

## Deployment Steps

### 1. Push to GitHub

Your indexer must be in a GitHub repository.

### 2. Connect to Envio

1. Go to [envio.dev/explorer](https://envio.dev/explorer)
2. Install the Envio Deployments GitHub App
3. Select your repository

### 3. Configure Deployment

- **Root directory**: Where your indexer lives (for monorepos)
- **Config file**: Path to `config.yaml`
- **Deployment branch**: Which branch triggers deploys

### 4. Deploy

Push to your deployment branch. The hosted service will:

1. Clone your repo
2. Install dependencies
3. Run codegen
4. Build and deploy
5. Start indexing

## Environment Variables

Set secrets in the Envio dashboard, not in your repo:

```bash
# Common env vars for hosted service
RPC_URL=https://...           # If using custom RPC
ETH_RPC_URL=https://...       # For multichain
POLYGON_RPC_URL=https://...
```

## Production Config Tips

```yaml
# config.yaml for production
name: my-production-indexer
rollback_on_reorg: true      # Always enable for production

networks:
  - id: 1
    start_block: 18000000    # Don't start from 0 unless needed
    confirmed_block_threshold: 250
    contracts:
      - name: MyContract
        address: "0x..."
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
            # Only include fields you actually use
            field_selection:
              transaction_fields:
                - "from"
                - "hash"
```

## Monitoring

The hosted service dashboard shows:

- **Sync progress** - Current block vs chain head
- **Logs** - Real-time and historical
- **Deployment status** - Build logs, errors
- **Health metrics** - Uptime, performance

## Alerting

Configure alerts for:

- Indexer stopped or crashed
- Sync falling behind
- Deployment failed
- Errors in handlers

Channels: Discord, Slack, Telegram, Email

## GraphQL Endpoint

Your production endpoint:
```
https://indexer.hyperindex.xyz/YOUR_INDEXER_SLUG/v1/graphql
```

Example query:
```graphql
query {
  Transfer(limit: 10, order_by: { blockNumber: desc }) {
    id
    from
    to
    value
  }
  _meta {
    block {
      number
    }
  }
}
```

## Version Management

- **Multiple versions** - Keep old versions running while testing new ones
- **One-click rollback** - Instantly switch to previous version
- **Zero-downtime deploys** - New version starts, traffic switches when ready

## Self-Hosting Alternative

For custom infrastructure needs:

```bash
# Basic self-hosting with Docker
git clone https://github.com/enviodev/local-docker-example
cd local-docker-example
docker-compose up
```

**Note:** Self-hosting requires managing:
- PostgreSQL database
- Docker/container orchestration
- Monitoring and alerting
- Scaling and backups

Recommended only for teams with infrastructure expertise.

## Deployment Workflow

```
┌─────────────────┐
│  Local Dev      │
│  pnpm dev       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Test Locally   │
│  TUI_OFF=true   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push to GitHub │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto Deploy    │
│  (Hosted Svc)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Monitor        │
│  Dashboard      │
└─────────────────┘
```

## Best Practices

1. **Test locally first** - Always verify before deploying
2. **Use environment variables** - Never commit secrets
3. **Enable reorg support** - `rollback_on_reorg: true`
4. **Set reasonable start_block** - Don't index from genesis unless needed
5. **Monitor after deploy** - Watch logs for first few minutes
6. **Configure alerts** - Know immediately if something breaks
