# BMAD MCP Server

**Multi-agent AI collaboration server implementing the Model Context Protocol (MCP)**

Bring the power of BMAD's specialized AI agents to your IDE through MCP integration. Enable party-mode discussions with 11+ expert agents including architects, developers, product managers, and more.

## Features

- 🎉 **Single Entry Point**: One tool (`bmad`) for all BMAD functionality - no need to remember 40+ tool names
- 🤖 **BMad Master Guide**: Default agent that helps you discover and navigate all capabilities
- 💬 **Natural Language**: Ask for what you want in plain English - "I want to plan a project"
- 🎭 **11+ Expert Agents**: Load specialized agents (PM, Architect, Dev, etc.) for focused collaboration
- ⚡ **46 Workflows**: Access full BMAD methodology including agile, testing, architecture, and more
- 🔌 **IDE Integration**: Works with Cline, Claude Desktop, Windsurf, Cursor, and other MCP-compatible IDEs
- 📦 **Self-Contained**: No repository required - agents and workflows are embedded in the package
- 🚀 **Zero Config**: Works out of the box with sensible defaults
- 🔒 **Secure**: Path traversal protection and manifest validation built-in

## Installation

### Via npm (Recommended)

```bash
npm install -g @bmad/mcp-server
```

### Via npx (No Installation)

```bash
npx @bmad/mcp-server
```

### From Source

```bash
git clone https://github.com/bmad-code-org/BMAD-METHOD.git
cd BMAD-METHOD/tools/mcp-server
npm install
npm run build
npm link
```

## Quick Start

The BMAD MCP Server runs as a stdio-based MCP server, designed to be configured in your IDE's MCP settings.

### Your First BMAD Interaction

After installation and IDE configuration, simply invoke:

```
Use bmad
```

This loads **BMad Master**, your guide through the BMAD ecosystem. BMad Master will present options and help you discover what's possible.

### How It Works

```
┌─────────────────────────────────────────┐
│  Your IDE (Claude, Cursor, Cline, etc) │
│                                         │
│  You: "Use bmad"                        │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  bmad (Unified Entry Point)             │
│                                          │
│  • No params → BMad Master (default)    │
│  • agent: "pm" → Load PM agent          │
│  • workflow: "plan-project" → Execute   │
│  • message: "plan project" → Parse      │
└──────────────┬───────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│  BMad Master Agent                       │
│                                          │
│  Intelligent routing to:                 │
│  • 11+ Specialized Agents               │
│  • 46 Workflows                         │
│  • Group Discussions (Party Mode)       │
└──────────────────────────────────────────┘
```

### Test Standalone

```bash
# Start the server (will listen on stdio)
bmad-mcp

# Or with npx
npx @bmad/mcp-server
```

## IDE Configuration

### Cline (VS Code Extension)

Add to your Cline MCP settings (`~/.cline/mcp_settings.json` or via VS Code settings):

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "@bmad/mcp-server"]
    }
  }
}
```

**Or if installed globally:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "bmad-mcp"
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "@bmad/mcp-server"]
    }
  }
}
```

**Or if installed globally:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "bmad-mcp"
    }
  }
}
```

### Windsurf

Add to Windsurf's MCP configuration file:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "@bmad/mcp-server"]
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "@bmad/mcp-server"]
    }
  }
}
```

## Usage

📖 **[Quick Reference Guide](./docs/QUICK-REFERENCE.md)** - Comprehensive usage patterns and examples

### Primary Tool: `bmad`

The BMAD MCP Server provides a **single unified entry point** for all functionality. The `bmad` tool intelligently routes your requests to the appropriate agents, workflows, or resources.

#### Quick Start - Get Help from BMad Master

**Simplest invocation (no parameters):**

```
Use bmad
```

This loads the **BMad Master** agent who will guide you through available options and help you get started.

#### Load a Specific Agent

**Talk to a Product Manager:**

```
Use bmad with agent: "pm"
```

**Talk to an Architect:**

```
Use bmad with agent: "architect"
```

**Available agents:** `pm`, `analyst`, `architect`, `dev`, `sm`, `tea`, `ux-expert`, `game-designer`, `game-architect`, `game-dev`, `bmad-master`

#### Execute a Workflow Directly

**Run a specific workflow:**

```
Use bmad with workflow: "plan-project" and inputs: {
  "projectName": "My Mobile App",
  "description": "A social networking app for artists"
}
```

**Run with module prefix:**

```
Use bmad with workflow: "bmm:tech-spec" and inputs: {
  "feature": "User authentication system"
}
```

#### Natural Language Requests

**Let BMAD figure out what you need:**

```
Use bmad with message: "I want to plan a software project"
```

```
Use bmad with message: "Help me brainstorm ideas for a mobile app"
```

```
Use bmad with message: "I need help with system architecture"
```

The tool will parse your intent and route you to the appropriate agent or workflow.

### Example Usage Patterns

#### Party Mode - Multi-Agent Discussion

```
Use bmad with workflow: "party-mode"
```

Or via natural language:

```
Use bmad with message: "Start a party mode discussion about microservices architecture"
```

#### Product Planning

```
Use bmad with message: "I want to create a PRD"
```

This will load the PM agent who can guide you through the PRD creation process.

#### Technical Architecture

```
Use bmad with agent: "architect"
```

The architect will help you design system architecture and make technical decisions.

#### Development Implementation

```
Use bmad with workflow: "dev-story" and inputs: {
  "storyId": "STORY-123"
}
```

### Advanced: Legacy Tools

For backward compatibility, the following utility tools are also available:

- `bmad-list-workflows` - List all available workflows
- `bmad-run` - Execute any workflow by module and slug
- `bmad-command` - Execute BMAD commands (e.g., `/bmad:master *party-mode`)
- `bmad-reload` - Reload workflow manifest

**Note:** These are deprecated in favor of the unified `bmad` tool.

## Meet the Agents

When you invoke party-mode, you'll collaborate with:

- **BMad Master** 🧙 - Orchestrator and knowledge custodian
- **Mary** (Analyst) 📊 - Business analysis and requirements
- **Winston** (Architect) 🏗️ - System architecture and technical design
- **Amelia** (Developer) 💻 - Implementation and coding
- **John** (Product Manager) 📋 - Product strategy and planning
- **Bob** (Scrum Master) 🏃 - Agile process and story management
- **Murat** (Test Architect) 🧪 - Testing strategy and quality gates
- **Sally** (UX Expert) 🎨 - User experience and design
- **Cloud Dragonborn** (Game Architect) 🏛️ - Game systems architecture
- **Samus Shepard** (Game Designer) 🎲 - Game design and mechanics
- **Link Freeman** (Game Developer) 🕹️ - Game implementation

## Workflows by Module

### Core (3 workflows)

- `party-mode` - Multi-agent discussions
- `brainstorming` - Creative ideation sessions
- `bmad-init` - System initialization

### BMM - BMAD Methodology (31 workflows)

Agile workflows including:

- Product briefs, PRDs, technical specs
- Story creation and review
- Test architecture and design
- Architecture and solution design
- Retrospectives and planning

### BMB - BMAD Builder (8 workflows)

Meta-workflows for:

- Creating custom agents
- Building new workflows
- Module development
- Documentation generation

### CIS - Creative Innovation (4 workflows)

- Design thinking
- Innovation strategy
- Problem solving
- Storytelling

## Troubleshooting

### Server won't start

**Check Node version:**

```bash
node --version  # Should be >= 20.0.0
```

**Rebuild embedded assets:**

```bash
cd node_modules/@bmad/mcp-server
npm run build
```

### No workflows discovered

**Verify manifest exists:**

```bash
ls node_modules/@bmad/mcp-server/embedded/manifest.json
```

**Check build:**

```bash
cd node_modules/@bmad/mcp-server
npm test
```

### Path errors

The server uses secure path resolution. If you see "resolves outside embedded directory" errors, this is a security feature preventing path traversal attacks.

### IDE not detecting server

1. Restart your IDE after adding MCP configuration
2. Check IDE logs for MCP connection errors
3. Verify the command is accessible: `which bmad-mcp` or `which npx`
4. Try absolute paths in configuration if relative paths fail

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/bmad-code-org/BMAD-METHOD.git
cd BMAD-METHOD/tools/mcp-server

# Install dependencies
npm install

# Build embedded assets
npm run build

# Run tests
npm test

# Test locally
node index.js
```

### Project Structure

```
tools/mcp-server/
├── index.js              # MCP server entry point
├── build.js              # Asset bundler
├── lib/
│   ├── discovery.js      # Workflow/agent discovery
│   ├── run.js            # Workflow execution
│   ├── router.js         # Command routing
│   └── resources.js      # MCP resource management
├── embedded/             # Bundled assets (generated)
│   ├── agents/           # Agent markdown files
│   ├── workflows/        # Workflow YAMLs and instructions
│   └── manifest.json     # Asset manifest
└── docs/                 # Story documentation
```

## Version Compatibility

| BMAD MCP Server | Node.js   | MCP SDK | IDEs                                    |
| --------------- | --------- | ------- | --------------------------------------- |
| 0.1.x           | >= 20.0.0 | 1.20.0  | Cline, Claude Desktop, Windsurf, Cursor |

## Contributing

This package is part of the BMAD-METHOD project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes in `tools/mcp-server/`
4. Run tests: `npm test`
5. Submit a pull request

See [CONTRIBUTING.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- **GitHub**: https://github.com/bmad-code-org/BMAD-METHOD
- **Documentation**: https://github.com/bmad-code-org/BMAD-METHOD/tree/main/docs
- **Issues**: https://github.com/bmad-code-org/BMAD-METHOD/issues
- **MCP Protocol**: https://modelcontextprotocol.io/

## Acknowledgments

Built on the Model Context Protocol by Anthropic. Part of the BMAD (Breakthrough Method of Agile AI-driven Development) methodology.

---

**Ready to collaborate with AI agents? Install now and start your first party-mode session!** 🎉
