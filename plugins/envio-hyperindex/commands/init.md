---
description: Initialize a new HyperIndex indexer project with guided setup
argument-hint: [contract-address-or-type]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

Initialize a new Envio HyperIndex indexer project.

## Project Setup

If $ARGUMENTS contains a contract address (0x...), use it for initialization.
If $ARGUMENTS is empty or contains a project type, guide through setup.

### Step 1: Project Initialization

Run the Envio initialization command:

```bash
pnpx envio init
```

This will prompt for:
- Contract import method (block explorer or local ABI)
- Network selection
- Contract address
- Events to index

### Step 2: Verify Generated Files

After init completes, verify these files exist:
- `config.yaml` - Indexer configuration
- `schema.graphql` - GraphQL schema
- `src/EventHandlers.ts` - Event handlers

### Step 3: Review Configuration

Check `config.yaml` for:
- Correct network ID
- Proper start block
- All required events
- Transaction field selection if needed

### Step 4: Enhance Schema

Review `schema.graphql` and suggest improvements:
- Add relationships between entities
- Include useful derived fields
- Consider time-series aggregates (daily data)

### Step 5: Run Codegen

```bash
pnpm codegen
```

### Step 6: Start Development

```bash
pnpm dev
```

## Best Practices Reminders

After setup, remind about:
- Using `${event.chainId}-` prefix for IDs (multichain support)
- Adding `field_selection` for transaction.hash access
- Using spread operator for entity updates
- Running `pnpm codegen` after config/schema changes

## Example Output

Guide the user through creating a production-ready indexer structure with proper patterns from the hyperindex-development skill.
