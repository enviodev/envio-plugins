# Logging & Debugging

Effective logging is essential for troubleshooting indexer issues. HyperIndex uses [pino](https://github.com/pinojs/pino) for high-performance logging.

## context.log Methods

Use the logging methods available on the context object in handlers:

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // Different severity levels
  context.log.debug(`Processing transfer ${event.transactionHash}`);
  context.log.info(`Transfer from ${event.params.from} to ${event.params.to}`);
  context.log.warn(`Large transfer detected: ${event.params.value}`);
  context.log.error(`Failed to process: ${event.transactionHash}`);
});
```

## Structured Logging

Pass an object as the second argument for structured logs:

```typescript
context.log.info("Processing transfer", {
  from: event.params.from,
  to: event.params.to,
  value: event.params.value.toString(),
  block: event.block.number,
});

// With error object
context.log.error("Handler failed", {
  error: err,
  event: event.transactionHash,
});
```

## Debugging Workflow

### Disable TUI for Full Logs

The Terminal UI can hide errors. Disable it to see all output:

```bash
# Option 1: Environment variable
TUI_OFF=true pnpm dev

# Option 2: Flag
pnpm dev --tui-off
```

### Recommended Debug Command

```bash
TUI_OFF=true pnpm dev 2>&1 | tee debug.log
```

This shows all output AND saves to a file for later analysis.

## Environment Variables

### Log Level

```bash
# Console log level (default: "info")
LOG_LEVEL="debug"    # Show debug logs
LOG_LEVEL="trace"    # Most verbose

# File log level (default: "trace")
FILE_LOG_LEVEL="debug"
```

### Log Strategy

```bash
# Default: Human-readable with colors
LOG_STRATEGY="console-pretty"

# ECS format for Elastic Stack / Kibana
LOG_STRATEGY="ecs-file"
LOG_STRATEGY="ecs-console"

# Efficient file-only logging
LOG_STRATEGY="file-only"
LOG_FILE="./indexer.log"

# Both console and file
LOG_STRATEGY="both-prettyconsole"
LOG_FILE="./debug.log"
```

## Common Debugging Patterns

### Log Entity State

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  const entity = await context.Account.get(event.params.user);

  context.log.debug("Entity state before update", {
    id: event.params.user,
    exists: !!entity,
    currentBalance: entity?.balance?.toString() ?? "N/A",
  });

  // ... update logic
});
```

### Log Only During Execution (Skip Preload)

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // Preload phase: load data
  const account = await context.Account.get(event.params.user);

  // Only log during actual execution
  if (!context.isPreload) {
    context.log.info("Processing account", {
      id: event.params.user,
      balance: account?.balance?.toString(),
    });
  }

  // ... rest of handler
});
```

### Debug Missing Data

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  const token = await context.Token.get(event.params.token);

  if (!token) {
    context.log.warn("Token not found - may be created by later event", {
      tokenAddress: event.params.token,
      block: event.block.number,
      txHash: event.transactionHash,
    });
    return;
  }

  // ...
});
```

## Preload Phase Logging Note

**Important:** `context.log` calls are ignored during the preload phase. Logs only appear during the execution phase. This is intentional - it prevents duplicate log entries since handlers run twice with preload optimization enabled.

## Troubleshooting Checklist

1. **Can't see errors?** → Run with `TUI_OFF=true`
2. **Need more detail?** → Set `LOG_LEVEL="debug"` or `"trace"`
3. **Want persistent logs?** → Set `LOG_STRATEGY="both-prettyconsole"` with `LOG_FILE`
4. **Logs appearing twice?** → Normal if you're logging outside `!context.isPreload` check
5. **No logs at all?** → Check you're not in preload phase; use `!context.isPreload` guard
