const path = require('node:path');
const fs = require('fs-extra');
const { resolveEmbeddedPath } = require('./discovery');
const { outputs, idForPath } = require('./resources');

/**
 * Unified handler for bmad tool
 * Routes to agents, workflows, or bmad-master based on parameters
 */
async function handleUnifiedTool({ message, agent, workflow, inputs, cwd, targetPath, dryRun, index, runWorkflow }) {
  // Priority order:
  // 1. Explicit workflow execution
  // 2. Explicit agent loading
  // 3. Natural language message parsing
  // 4. Default: load bmad-master

  // Case 1: Direct workflow execution
  if (workflow) {
    return await executeWorkflow({ workflow, inputs, cwd, targetPath, dryRun, index, runWorkflow });
  }

  // Case 2: Load specific agent
  if (agent) {
    return await loadAgent({ agent, index });
  }

  // Case 3: Parse natural language message
  if (message) {
    return await parseIntent({ message, inputs, cwd, targetPath, dryRun, index, runWorkflow });
  }

  // Case 4: Default - load bmad-master
  return await loadAgent({ agent: 'bmad-master', index });
}

/**
 * Execute a workflow directly by slug
 */
async function executeWorkflow({ workflow, inputs, cwd, targetPath, dryRun, index, runWorkflow }) {
  // Try to find workflow across all modules
  const wf = index.workflows.find((w) => w.slug === workflow);

  if (!wf) {
    // Try module:slug format
    const parts = workflow.split(':');
    if (parts.length === 2) {
      const [module, slug] = parts;
      const wf = index.workflows.find((w) => w.module === module && w.slug === slug);
      if (wf) {
        return await executeWorkflowObject({ wf, inputs, cwd, targetPath, dryRun, runWorkflow });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Workflow not found: ${workflow}\n\nAvailable workflows:\n${index.workflows.map((w) => `- ${w.module}:${w.slug}`).join('\n')}`,
        },
      ],
    };
  }

  return await executeWorkflowObject({ wf, inputs, cwd, targetPath, dryRun, runWorkflow });
}

async function executeWorkflowObject({ wf, inputs, cwd, targetPath, dryRun, runWorkflow }) {
  const res = await runWorkflow({ wf, cwd, inputs, targetPath, dryRun, writeDefault: true });
  const content = [{ type: 'text', text: res.summary + (res.path ? `\npath: ${res.path}` : '') }];

  if (res.path) {
    const id = idForPath(res.path);
    outputs.set(id, res.path);
    content.push({
      type: 'resource',
      resource: {
        uri: `bmad://output/${id}`,
        mimeType: 'text/markdown',
        text: await fs.readFile(res.path, 'utf8'),
      },
    });
  }

  return { content, structuredContent: res };
}

/**
 * Load an agent persona and return their markdown
 */
async function loadAgent({ agent, index }) {
  const agentSlug = agent.toLowerCase();

  // Find agent in manifest
  const agentInfo = index.agents.find((a) => a.name === agentSlug || a.displayName?.toLowerCase() === agentSlug);

  if (!agentInfo) {
    return {
      content: [
        {
          type: 'text',
          text: `Agent not found: ${agent}\n\nAvailable agents:\n${index.agents.map((a) => `- ${a.name} (${a.displayName || a.name})`).join('\n')}`,
        },
      ],
    };
  }

  // Load agent markdown file from embedded path
  try {
    const agentPath = resolveEmbeddedPath(agentInfo.embeddedPath);
    const agentMarkdown = await fs.readFile(agentPath, 'utf8');

    return {
      content: [
        {
          type: 'text',
          text: `Loaded agent: ${agentInfo.displayName || agentInfo.name}\n\n${agentMarkdown}`,
        },
      ],
      structuredContent: {
        agent: agentInfo.name,
        displayName: agentInfo.displayName,
        role: agentInfo.role,
        markdown: agentMarkdown,
      },
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to load agent ${agent}: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Parse natural language message and route to appropriate agent/workflow
 */
async function parseIntent({ message, inputs, cwd, targetPath, dryRun, index, runWorkflow }) {
  const msg = message.toLowerCase().trim();

  // Intent mapping - simple keyword-based routing
  // TODO: Make this more sophisticated in future releases
  const intentMap = {
    // Planning keywords → PM agent
    plan: { agent: 'pm', workflow: 'plan-project' },
    project: { agent: 'pm', workflow: 'plan-project' },
    prd: { agent: 'pm', workflow: 'prd' },
    requirements: { agent: 'analyst' },

    // Architecture keywords → Architect agent
    architect: { agent: 'architect', workflow: 'solution-architecture' },
    architecture: { agent: 'architect', workflow: 'solution-architecture' },
    'tech spec': { agent: 'architect', workflow: 'tech-spec' },
    technical: { agent: 'architect' },

    // Development keywords → DEV agent
    implement: { agent: 'dev', workflow: 'dev-story' },
    code: { agent: 'dev' },
    develop: { agent: 'dev', workflow: 'dev-story' },
    story: { agent: 'sm', workflow: 'create-story' },

    // Testing keywords → TEA agent
    test: { agent: 'tea' },
    quality: { agent: 'tea' },
    qa: { agent: 'tea' },

    // UX keywords → UX agent
    ux: { agent: 'ux-expert', workflow: 'ux-spec' },
    'user experience': { agent: 'ux-expert', workflow: 'ux-spec' },
    ui: { agent: 'ux-expert' },
    design: { agent: 'ux-expert' },

    // Game development keywords → Game agents
    game: { agent: 'game-designer', workflow: 'gdd' },
    gdd: { agent: 'game-designer', workflow: 'gdd' },
    gameplay: { agent: 'game-designer' },
    'game design': { agent: 'game-designer', workflow: 'gdd' },

    // Creative keywords → CIS brainstorming
    brainstorm: { workflow: 'brainstorming' },
    ideate: { workflow: 'brainstorming' },
    ideas: { workflow: 'brainstorming' },
    creative: { workflow: 'brainstorming' },

    // Research keywords → Analyst
    research: { agent: 'analyst', workflow: 'research' },
    analyze: { agent: 'analyst' },
    market: { agent: 'analyst', workflow: 'research' },
    competitive: { agent: 'analyst', workflow: 'research' },
  };

  // Find matching intent
  for (const [keyword, routing] of Object.entries(intentMap)) {
    if (msg.includes(keyword)) {
      // Prefer workflow execution if specified and inputs provided
      if (routing.workflow && inputs) {
        return await executeWorkflow({
          workflow: routing.workflow,
          inputs,
          cwd,
          targetPath,
          dryRun,
          index,
          runWorkflow,
        });
      }

      // Otherwise load the agent for guidance
      if (routing.agent) {
        return await loadAgent({ agent: routing.agent, index });
      }

      // Or execute the workflow
      if (routing.workflow) {
        return await executeWorkflow({
          workflow: routing.workflow,
          inputs,
          cwd,
          targetPath,
          dryRun,
          index,
          runWorkflow,
        });
      }
    }
  }

  // No match found - load bmad-master with the user's message as context
  const masterResult = await loadAgent({ agent: 'bmad-master', index });

  // Prepend user's message to help bmad-master understand context
  masterResult.content[0].text = `User request: "${message}"\n\n${masterResult.content[0].text}\n\n---\n\nI can help you with this request. What would you like to know?`;

  return masterResult;
}

module.exports = { handleUnifiedTool };
