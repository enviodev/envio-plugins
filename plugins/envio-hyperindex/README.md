# Envio HyperIndex Plugin for Claude Code

A comprehensive plugin that teaches Claude Code how to develop blockchain indexers with Envio's HyperIndex framework.

## Features

### Skills

- **hyperindex-development** - Core HyperIndex development patterns including config, schema, handlers, and the Effect API
- **subgraph-migration** - Complete guide for migrating from TheGraph subgraphs to HyperIndex

### Commands

- `/envio:init` - Initialize a new HyperIndex indexer project with guided setup

### Agents

- **hyperindex-helper** - Autonomous agent for debugging indexer issues, fixing TypeScript errors, and implementing complex handlers

## Installation

### From Plugin Directory

```bash
claude --plugin-dir /path/to/envio-hyperindex
```

### Copy to Project

Copy the `envio-hyperindex` folder to your project's `.claude-plugins/` directory.

## Usage

### Start a New Indexer

```
/envio:init 0xContractAddress
```

Or just ask:

```
Help me create a HyperIndex indexer for Uniswap V2
```

### Get Development Help

The skills trigger automatically when you ask about:
- Creating event handlers
- Configuring config.yaml
- Defining GraphQL schemas
- Working with entity relationships
- Using the Effect API for RPC calls

### Migrate from TheGraph

Ask about subgraph migration:

```
Help me migrate my Uniswap subgraph to HyperIndex
```

### Debug Issues

The agent helps with:
- TypeScript compilation errors
- Missing or incorrect data
- Runtime errors
- Performance optimization

## Documentation

### Quick References

| Topic | Location |
|-------|----------|
| Config options | `skills/hyperindex-development/references/config-options.md` |
| Effect API | `skills/hyperindex-development/references/effect-api.md` |
| Entity patterns | `skills/hyperindex-development/references/entity-patterns.md` |
| Migration patterns | `skills/subgraph-migration/references/migration-patterns.md` |
| Common mistakes | `skills/subgraph-migration/references/common-mistakes.md` |

### Examples

| Example | Location |
|---------|----------|
| Basic handler | `skills/hyperindex-development/examples/basic-handler.ts` |
| Factory pattern | `skills/hyperindex-development/examples/factory-pattern.ts` |

## External Resources

- [HyperIndex Documentation](https://docs.envio.dev/docs/HyperIndex-LLM/hyperindex-complete)
- [Envio GitHub](https://github.com/enviodev/hyperindex)
- [Example: Uniswap V4 Indexer](https://github.com/enviodev/uniswap-v4-indexer)
- [Example: Safe Indexer](https://github.com/enviodev/safe-analysis-indexer)

## Development Requirements

- Node.js v20+ (v22 recommended)
- pnpm v8+
- Docker Desktop (for local development)

## Contributing

Contributions welcome! Please submit issues and pull requests to improve the plugin.

## License

MIT
