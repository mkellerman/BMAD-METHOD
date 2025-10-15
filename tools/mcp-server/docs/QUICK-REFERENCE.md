# BMAD MCP Server - Quick Reference

## Single Entry Point: `bmad`

All BMAD functionality is accessible through one unified tool. No need to remember 40+ tool names!

## Usage Patterns

### 1. Get Help (Default - No Parameters)

```
Use bmad
```

**Returns:** BMad Master agent who guides you through all available options.

---

### 2. Load a Specific Agent

```
Use bmad with agent: "AGENT_NAME"
```

**Available Agents:**

| Agent Name       | Role                | Best For                                     |
| ---------------- | ------------------- | -------------------------------------------- |
| `pm`             | Product Manager     | Product planning, PRDs, roadmaps             |
| `analyst`        | Business Analyst    | Requirements, research, competitive analysis |
| `architect`      | System Architect    | Architecture design, tech decisions          |
| `dev`            | Developer           | Code implementation, story execution         |
| `sm`             | Scrum Master        | Sprint planning, story management            |
| `tea`            | Test Architect      | Test strategy, quality gates                 |
| `ux-expert`      | UX Designer         | User experience, UI design                   |
| `game-designer`  | Game Designer       | Game mechanics, GDD                          |
| `game-architect` | Game Architect      | Game systems architecture                    |
| `game-dev`       | Game Developer      | Game implementation                          |
| `bmad-master`    | Master Orchestrator | Navigation, guidance, party mode             |

**Examples:**

```
Use bmad with agent: "architect"
Use bmad with agent: "pm"
Use bmad with agent: "game-designer"
```

---

### 3. Execute a Workflow Directly

```
Use bmad with workflow: "WORKFLOW_SLUG" and inputs: { "key": "value" }
```

**Common Workflows:**

| Workflow                | Description                     |
| ----------------------- | ------------------------------- |
| `party-mode`            | Multi-agent group discussion    |
| `plan-project`          | Scale-adaptive project planning |
| `prd`                   | Product Requirements Document   |
| `tech-spec`             | Technical specification         |
| `solution-architecture` | System architecture design      |
| `create-story`          | User story creation             |
| `dev-story`             | Story implementation            |
| `brainstorming`         | Creative ideation session       |
| `research`              | Market/technical research       |
| `gdd`                   | Game Design Document            |

**Examples:**

```
Use bmad with workflow: "party-mode"

Use bmad with workflow: "plan-project" and inputs: {
  "projectName": "My Mobile App",
  "description": "Social network for artists"
}

Use bmad with workflow: "tech-spec" and inputs: {
  "feature": "User authentication system"
}
```

**Module Prefix Format:**

```
Use bmad with workflow: "bmm:prd"
Use bmad with workflow: "core:party-mode"
```

---

### 4. Natural Language Requests

```
Use bmad with message: "YOUR_REQUEST_IN_PLAIN_ENGLISH"
```

**The tool parses your intent and routes to the appropriate agent or workflow.**

**Examples:**

```
Use bmad with message: "I want to plan a software project"
→ Routes to PM agent

Use bmad with message: "Help me design system architecture"
→ Routes to Architect agent

Use bmad with message: "I need to brainstorm ideas"
→ Routes to brainstorming workflow

Use bmad with message: "Create a technical specification"
→ Routes to tech-spec workflow

Use bmad with message: "Start a party mode discussion about microservices"
→ Loads BMad Master with context
```

**Keyword Routing:**

| Keywords                        | Routes To              |
| ------------------------------- | ---------------------- |
| plan, project, prd              | PM agent               |
| architect, architecture, design | Architect agent        |
| implement, code, develop        | Developer agent        |
| test, quality, qa               | Test Architect         |
| ux, ui, user experience         | UX Expert              |
| game, gameplay, gdd             | Game Designer          |
| brainstorm, ideate, creative    | Brainstorming workflow |
| research, analyze, market       | Analyst agent          |
| story                           | Scrum Master           |

---

## Advanced Parameters

### Workspace Directory

```
Use bmad with workflow: "plan-project" and cwd: "/path/to/project"
```

**Purpose:** Specifies where output files should be written.

### Target Path

```
Use bmad with workflow: "prd" and targetPath: "/path/to/docs/prd.md"
```

**Purpose:** Explicitly set the output file path.

### Dry Run (Preview Only)

```
Use bmad with workflow: "tech-spec" and dryRun: true
```

**Purpose:** Generate content without writing files (preview mode).

### Combined Parameters

```
Use bmad with {
  workflow: "plan-project",
  inputs: { "projectName": "My App" },
  cwd: "/Users/me/projects/myapp",
  dryRun: false
}
```

---

## Common Workflows

### 1. First-Time User Journey

```
Step 1: Use bmad
  → BMad Master greets and presents options

Step 2: Ask BMad Master questions
  → "What can you help me with?"
  → "How do I plan a project?"

Step 3: Follow guidance to specific agents/workflows
```

### 2. Planning a Software Project

```
Use bmad with message: "I want to plan a software project"
  → Loads PM agent
  → Follow prompts for scale-adaptive planning
```

### 3. Multi-Agent Discussion (Party Mode)

```
Use bmad with workflow: "party-mode"
  → 11 agents collaborate on your topic
  → Great for complex discussions and brainstorming
```

### 4. Game Development

```
Use bmad with agent: "game-designer"
  → Game Designer helps plan your game
  → Can guide you through GDD creation
```

### 5. Quick Architecture Design

```
Use bmad with agent: "architect"
  → Architect discusses your system design needs
  → Can execute solution-architecture workflow
```

---

## Tips & Best Practices

### ✅ DO

- Start with no parameters to explore options via BMad Master
- Use natural language when you're not sure which workflow to use
- Load specific agents when you know exactly what expertise you need
- Execute workflows directly when you have all required inputs ready

### ❌ DON'T

- Don't try to remember all workflow names - use natural language instead
- Don't worry about exact keyword matching - the intent parser is flexible
- Don't skip BMad Master if you're new - they'll guide you effectively

---

## Troubleshooting

### "Workflow not found"

**Problem:** Invalid workflow slug.

**Solution:** Use `bmad-list-workflows` or ask BMad Master for available workflows.

### "Agent not found"

**Problem:** Invalid agent name.

**Solution:** Check the agent table above or use `bmad` to see options.

### Natural language not routing correctly

**Problem:** Intent parsing didn't match your request.

**Solution:** BMad Master will still load with your message as context. They can help clarify and route you properly.

---

## Support & Resources

- **MCP Server README**: `tools/mcp-server/README.md`
- **BMM Documentation**: `src/modules/bmm/README.md`
- **Workflows Guide**: `src/modules/bmm/workflows/README.md`
- **GitHub Issues**: https://github.com/bmad-code-org/BMAD-METHOD/issues
- **Discord Community**: https://discord.gg/gk8jAdXWmj

---

**Remember: When in doubt, just `Use bmad` and let BMad Master guide you!** 🧙
