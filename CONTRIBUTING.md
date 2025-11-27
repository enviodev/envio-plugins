# Contributing to Envio Plugins

Thank you for your interest in contributing to Envio's Claude Code plugins!

## Getting Started

1. Fork this repository
2. Clone your fork locally
3. Create a feature branch: `git checkout -b feature/my-plugin`

## Plugin Development

### Creating a New Plugin

1. **Create the plugin directory:**
   ```bash
   mkdir -p plugins/my-plugin/.claude-plugin
   mkdir -p plugins/my-plugin/skills
   mkdir -p plugins/my-plugin/commands
   mkdir -p plugins/my-plugin/agents
   ```

2. **Create the plugin manifest** (`plugins/my-plugin/.claude-plugin/plugin.json`):
   ```json
   {
     "name": "my-plugin",
     "version": "1.0.0",
     "description": "Brief description of what this plugin does",
     "author": "Your Name"
   }
   ```

3. **Add a skill** (`plugins/my-plugin/skills/my-skill/SKILL.md`):
   ```markdown
   ---
   name: My Skill
   description: Triggers when user asks about X, Y, or Z
   ---

   # My Skill

   Content here...
   ```

4. **Add a README** (`plugins/my-plugin/README.md`)

5. **Update the registry** - Add your plugin to `plugins.json`

### Plugin Guidelines

**Skills should:**
- Have clear, specific trigger descriptions
- Use progressive disclosure (lean SKILL.md, detailed references/)
- Include practical code examples
- Reference official documentation

**Commands should:**
- Have descriptive names
- Include clear argument documentation
- Provide helpful output

**Agents should:**
- Have specific, well-defined purposes
- Include example interactions
- Specify required tools

### Code Style

- Use consistent markdown formatting
- Prefer TypeScript examples over JavaScript
- Include comments in complex code examples
- Test all code examples before submitting

## Testing Your Plugin

1. Symlink to your Claude plugins directory:
   ```bash
   ln -s $(pwd)/plugins/my-plugin ~/.claude/plugins/my-plugin
   ```

2. Restart Claude Code or reload plugins

3. Test trigger phrases and commands

4. Verify skills activate in appropriate contexts

## Submitting Changes

1. **Update documentation:**
   - Update plugin's README.md
   - Update root README.md plugin table
   - Update plugins.json registry

2. **Commit with clear messages:**
   ```bash
   git commit -m "feat(my-plugin): add new skill for X"
   ```

3. **Push and create PR:**
   ```bash
   git push origin feature/my-plugin
   ```

4. **PR description should include:**
   - What the plugin/change does
   - How to test it
   - Any breaking changes

## Commit Message Format

We follow conventional commits:

- `feat(plugin-name): description` - New feature
- `fix(plugin-name): description` - Bug fix
- `docs(plugin-name): description` - Documentation only
- `refactor(plugin-name): description` - Code refactoring

## Questions?

- Open an issue for questions or suggestions
- Join our Discord for real-time discussion
- Check existing plugins for examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
