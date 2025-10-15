#!/usr/bin/env node
/*
BMAD MCP Server (stdio)
- Embedded discovery of workflows and agents
- Per-workflow tools (bmad-{module}-{slug}) registered at startup
- Generic tools: bmad-list-workflows, bmad-run, bmad-command, bmad-reload
- Writes prompt packs to target repo cwd by default
*/

const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
// ESM-only packages are imported dynamically inside main()
let McpServer;
let ResourceTemplate;
let StdioServerTransport;
let z;

const { discoverWorkflows, resolveRepoRoot } = require('./lib/discovery');
const { runWorkflow, writePromptPack } = require('./lib/run');
const { handleCommand } = require('./lib/router');
const { handleUnifiedTool } = require('./lib/unified-handler');
const { outputs, idForPath } = require('./lib/resources');

async function main() {
  // Load ESM modules at runtime for CJS compatibility
  ({ McpServer, ResourceTemplate } = await import('@modelcontextprotocol/sdk/server/mcp.js'));
  ({ StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js'));
  ({ z } = await import('zod'));

  const server = new McpServer({ name: 'bmad-mcp', version: '0.1.0' });

  // Expose generated outputs as MCP resources for clients that auto-fetch
  server.registerResource(
    'bmad-output',
    new ResourceTemplate('bmad://output/{id}', { list: undefined }),
    {
      title: 'BMAD Output Documents',
      description: 'Generated prompt packs from BMAD workflows',
      mimeType: 'text/markdown',
    },
    async (uri, { id }) => {
      const p = outputs.get(String(id));
      if (!p) {
        return { contents: [{ uri: uri.href, text: `Not found: ${id}` }] };
      }
      const text = await fs.readFile(p, 'utf8');
      return { contents: [{ uri: uri.href, text }] };
    },
  );

  // Shared in-memory index
  let index = await discoverWorkflows();

  // ========================================
  // PRIMARY TOOL: bmad (Unified Entry Point)
  // ========================================
  server.registerTool(
    'bmad',
    {
      title: 'BMAD Universal Entry Point',
      description:
        'Universal entry point for BMAD. Invoked without parameters loads bmad-master agent. ' +
        'Can route to specific agents, execute workflows, or parse natural language requests.',
      inputSchema: {
        message: z.string().optional().describe('Natural language request (e.g., "I want to plan a project", "help me brainstorm")'),
        agent: z.string().optional().describe('Load specific agent by name (e.g., "pm", "architect", "dev")'),
        workflow: z.string().optional().describe('Execute specific workflow by slug or module:slug (e.g., "plan-project", "bmm:prd")'),
        inputs: z.record(z.any()).optional().describe('Key/value inputs for workflow execution'),
        cwd: z.string().optional().describe('Target workspace directory to write into'),
        targetPath: z.string().optional().describe('Optional explicit target file path'),
        dryRun: z.boolean().optional().describe('Set true to avoid writing files'),
      },
    },
    async ({ message, agent, workflow, inputs, cwd, targetPath, dryRun }) => {
      return await handleUnifiedTool({
        message,
        agent,
        workflow,
        inputs,
        cwd,
        targetPath,
        dryRun,
        index,
        runWorkflow,
      });
    },
  );

  // ========================================
  // LEGACY/UTILITY TOOLS
  // ========================================

  // NOTE: Per-workflow tools are deprecated in favor of bmad unified entry point
  // Keeping these for now but will be removed in future releases
  // Helper to (re)register per-workflow tools (best effort; some clients may cache tools per session)
  const registeredNames = new Set();
  function registerPerWorkflowTools() {
    // DEPRECATED: Skip per-workflow tool registration
    // All workflow access now goes through bmad unified tool
    return;

    /* Original per-workflow tool logic - commented out
    for (const wf of index.workflows) {
      const toolName = sanitize(`bmad-${wf.module}-${wf.slug}`);
      // Avoid duplicates in case of reload
      if (registeredNames.has(toolName)) continue;

      server.registerTool(
        toolName,
        {
          title: `${wf.module}/${wf.slug}`,
          description: wf.title || `Run ${wf.module}/${wf.slug}`,
          inputSchema: {
            cwd: z.string().optional().describe('Target workspace directory to write into'),
            inputs: z.record(z.any()).optional().describe('Key/value inputs for the workflow'),
            targetPath: z.string().optional().describe('Optional explicit target file path'),
            dryRun: z.boolean().optional().describe('Set true to avoid writing'),
          },
        },
        async ({ cwd, inputs, targetPath, dryRun }) => {
          const res = await runWorkflow({ wf, cwd, inputs, targetPath, dryRun, writeDefault: true });
          const content = [{ type: 'text', text: res.summary + (res.path ? `\npath: ${res.path}` : '') }];
          if (res.path) {
            const id = idForPath(res.path);
            outputs.set(id, res.path);
            content.push({
              type: 'resource_link',
              uri: `bmad://output/${id}`,
              name: path.basename(res.path),
              mimeType: 'text/markdown',
              description: `${wf.module}/${wf.slug} prompt pack`,
            });
          }
          return { content, structuredContent: res };
        },
      );
      registeredNames.add(toolName);
    }
    */
  }

  // Generic: list workflows
  server.registerTool(
    'bmad-list-workflows',
    {
      title: 'List BMAD Workflows',
      description: 'Enumerate discovered workflows',
      inputSchema: { module: z.string().optional() },
      outputSchema: {
        workflows: z.array(z.object({ module: z.string(), slug: z.string(), title: z.string().optional() })),
      },
    },
    async ({ module }) => {
      const rows = index.workflows
        .filter((w) => (module ? w.module === module : true))
        .map((w) => ({ module: w.module, slug: w.slug, title: w.title }));
      return {
        content: [{ type: 'text', text: rows.map((r) => `${r.module}/${r.slug} - ${r.title || ''}`).join('\n') || 'No workflows found' }],
        structuredContent: { workflows: rows },
      };
    },
  );

  // Generic: run workflow by id
  server.registerTool(
    'bmad-run',
    {
      title: 'Run BMAD Workflow',
      description: 'Run any workflow by module and slug',
      inputSchema: {
        module: z.string(),
        slug: z.string(),
        cwd: z.string().optional(),
        inputs: z.record(z.any()).optional(),
        targetPath: z.string().optional(),
        dryRun: z.boolean().optional(),
      },
    },
    async ({ module, slug, cwd, inputs, targetPath, dryRun }) => {
      const wf = index.workflows.find((w) => w.module === module && w.slug === slug);
      if (!wf) throw new Error(`Workflow not found: ${module}/${slug}`);
      const res = await runWorkflow({ wf, cwd, inputs, targetPath, dryRun, writeDefault: true });
      const content = [{ type: 'text', text: res.summary + (res.path ? `\npath: ${res.path}` : '') }];
      if (res.path) {
        const id = idForPath(res.path);
        outputs.set(id, res.path);
        content.push({
          type: 'resource_link',
          uri: `bmad://output/${id}`,
          name: path.basename(res.path),
          mimeType: 'text/markdown',
          description: `${module}/${slug} prompt pack`,
        });
      }
      return { content, structuredContent: res };
    },
  );

  // Command router: "/bmad:master" and "/bmad:master *party-mode" etc
  server.registerTool(
    'bmad-command',
    {
      title: 'BMAD Command Router',
      description: 'Parse slash-style commands and route to workflows or help',
      inputSchema: {
        text: z.string().describe('Command text, e.g., "/bmad:master *party-mode"'),
        cwd: z.string().optional(),
        targetPath: z.string().optional(),
        inputs: z.record(z.any()).optional(),
        dryRun: z.boolean().optional(),
      },
    },
    async ({ text, cwd, targetPath, inputs, dryRun }) => {
      return handleCommand({ text, cwd, targetPath, inputs, dryRun, index, runWorkflow });
    },
  );

  // Reload discovery (note: many clients cache tool registry until reconnect)
  server.registerTool(
    'bmad-reload',
    { title: 'Reload BMAD Workflows', description: 'Rescan repo for workflows', inputSchema: {} },
    async () => {
      index = await discoverWorkflows();
      registerPerWorkflowTools();
      // Some clients support change notifications; SDK emits them automatically for registerTool
      return { content: [{ type: 'text', text: `Reloaded ${index.workflows.length} workflows.` }] };
    },
  );

  // Initial per-workflow registration
  registerPerWorkflowTools();

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function pathToFileUri(p) {
  const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const prefix = process.platform === 'win32' ? 'file:///' : 'file://';
  return prefix + absolute.split(path.sep).map(encodeURIComponent).join('/');
}

main().catch((error) => {
  console.error('[bmad-mcp] Fatal:', error?.stack || error);
  process.exit(1);
});
