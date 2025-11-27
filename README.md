# Envio Claude Code Plugins

Official plugin marketplace for Envio's Claude Code plugins. These plugins enhance Claude Code with specialized knowledge and capabilities for Envio development.

## Available Plugins

| Plugin | Description | Version |
|--------|-------------|---------|
| [envio-hyperindex](./plugins/envio-hyperindex) | HyperIndex blockchain indexer development | 1.0.0 |

## Installation

### Quick Install (Recommended)

Add the entire marketplace to Claude Code:

```bash
claude plugins add https://github.com/enviodev/envio-plugins
```

This gives you access to all Envio plugins.

### Install Individual Plugin

To install a specific plugin only:

```bash
claude plugins add https://github.com/enviodev/envio-plugins/plugins/envio-hyperindex
```

### Local Development

Clone and symlink for local development:

```bash
git clone https://github.com/enviodev/envio-plugins.git
cd envio-plugins

# Symlink entire marketplace
ln -s $(pwd) ~/.claude/plugins/envio-plugins

# Or symlink individual plugin
ln -s $(pwd)/plugins/envio-hyperindex ~/.claude/plugins/envio-hyperindex
```

## Usage

Once installed, plugins activate automatically based on context. For example:

- **HyperIndex Development**: Ask Claude to "create an indexer", "write event handlers", or mention HyperIndex/Envio
- **Subgraph Migration**: Ask Claude to "migrate from subgraph" or "convert thegraph indexer"

### Available Commands

```
/envio-hyperindex:init    Initialize a new HyperIndex project
```

### Available Skills

| Skill | Triggers |
|-------|----------|
| HyperIndex Development | "create indexer", "event handlers", "config.yaml", "schema.graphql" |
| Subgraph Migration | "migrate from subgraph", "convert thegraph", "subgraph to hyperindex" |

### Available Agents

| Agent | Purpose |
|-------|---------|
| HyperIndex Helper | Debug indexers, explain patterns, review code |

## Plugin Structure

Each plugin follows the Claude Code plugin specification:

```
plugins/
└── plugin-name/
    ├── .claude-plugin/
    │   └── plugin.json      # Plugin manifest
    ├── skills/              # Context-aware knowledge
    │   └── skill-name/
    │       ├── SKILL.md
    │       └── references/
    ├── commands/            # Slash commands
    ├── agents/              # Specialized agents
    └── README.md
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding a New Plugin

1. Create plugin directory under `plugins/`
2. Add required `.claude-plugin/plugin.json` manifest
3. Add skills, commands, or agents as needed
4. Update this README's plugin table
5. Submit a pull request

## Resources

- [Envio Documentation](https://docs.envio.dev)
- [HyperIndex Docs](https://docs.envio.dev/docs/HyperIndex/overview)
- [Claude Code Plugin Development](https://docs.anthropic.com/claude-code/plugins)

## License

Source Available - see [LICENSE](./LICENSE) for details.
