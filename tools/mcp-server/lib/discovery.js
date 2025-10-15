const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const glob = require('glob');

/**
 * Resolve embedded assets root (for standalone mode)
 */
function resolveEmbeddedRoot() {
  return path.resolve(__dirname, '../embedded');
}

/**
 * Resolve embedded path with security validation
 * @param {string} relativePath - Relative path from embedded root
 * @returns {string} Absolute path within embedded directory
 */
function resolveEmbeddedPath(relativePath) {
  const embeddedRoot = resolveEmbeddedRoot();
  const resolved = path.join(embeddedRoot, relativePath);

  // Security: ensure path is within embedded directory
  if (!resolved.startsWith(embeddedRoot)) {
    throw new Error(`[bmad-mcp] Invalid path: ${relativePath} resolves outside embedded directory`);
  }

  return resolved;
}

/**
 * Load and validate embedded manifest
 * @returns {Promise<Object>} Parsed manifest with workflows, agents, metadata
 */
async function loadEmbeddedManifest() {
  const manifestPath = resolveEmbeddedPath('manifest.json');

  if (!(await fs.pathExists(manifestPath))) {
    throw new Error(
      `[bmad-mcp] Embedded manifest not found at ${manifestPath}\n` + 'Make sure to run "npm run build" before starting the server.',
    );
  }

  let manifest;
  try {
    manifest = await fs.readJSON(manifestPath);
  } catch (error) {
    throw new Error(`[bmad-mcp] Failed to parse manifest: ${error.message}`);
  }

  // Validate schema
  if (!manifest.workflows || !Array.isArray(manifest.workflows)) {
    throw new Error('[bmad-mcp] Invalid manifest: missing workflows array');
  }
  if (!manifest.agents || !Array.isArray(manifest.agents)) {
    throw new Error('[bmad-mcp] Invalid manifest: missing agents array');
  }
  if (!manifest.version) {
    throw new Error('[bmad-mcp] Invalid manifest: missing version field');
  }

  console.log(
    `[bmad-mcp] Loaded embedded manifest v${manifest.version}: ${manifest.workflows.length} workflows, ${manifest.agents.length} agents`,
  );

  return manifest;
}

function resolveRepoRoot() {
  // tools/mcp-server -> repo root
  const root = path.resolve(__dirname, '../../..');
  return root;
}

function ensureArray(val) {
  return Array.isArray(val) ? val : val ? [val] : [];
}

async function discoverWorkflows() {
  console.log('[bmad-mcp] Running in embedded mode');

  const manifest = await loadEmbeddedManifest();
  const embeddedRoot = resolveEmbeddedRoot();

  console.log(`[bmad-mcp] Embedded assets location: ${embeddedRoot}`);

  // Convert manifest workflows to discovery format
  const workflows = [];
  for (const wf of manifest.workflows) {
    const workflowDir = resolveEmbeddedPath(wf.embeddedPath);

    // Check for workflow.yaml
    const workflowYamlPath = path.join(workflowDir, 'workflow.yaml');
    const hasWorkflowYaml = await fs.pathExists(workflowYamlPath);

    // Check for instructions.md
    const instructionsPath = path.join(workflowDir, 'instructions.md');
    const hasInstructions = await fs.pathExists(instructionsPath);

    workflows.push({
      module: wf.module,
      slug: wf.slug,
      title: wf.title || wf.slug,
      instructionsPath: hasInstructions ? instructionsPath : null,
      workflowPath: hasWorkflowYaml ? workflowYamlPath : null,
    });
  }

  console.log(`[bmad-mcp] Discovered ${workflows.length} workflows from embedded manifest`);

  return {
    repoRoot: embeddedRoot,
    srcRoot: embeddedRoot,
    coreWorkflowsRoot: resolveEmbeddedPath('workflows/core'),
    modulesRoot: resolveEmbeddedPath('workflows'),
    workflows,
    agents: manifest.agents,
    masterAgent: null, // Can be loaded from embedded agents if needed
  };
}

async function loadWorkflowFromYaml(moduleName, workflowYamlPath) {
  const folder = path.dirname(workflowYamlPath);
  const data = yaml.load(await fs.readFile(workflowYamlPath, 'utf8')) || {};
  const slug = (data?.name || path.basename(folder)).toString();
  let instructionsPath = null;
  if (data?.instructions) {
    // Instructions can be relative or contain {project-root} which we ignore here
    const raw = data.instructions;
    if (typeof raw === 'string') {
      instructionsPath = resolveInstructionPath(workflowYamlPath, raw);
    }
  } else {
    const candidate = path.join(folder, 'instructions.md');
    if (await fs.pathExists(candidate)) instructionsPath = candidate;
  }
  const title = (data?.title || data?.displayName || data?.name || slug)?.toString();
  // Skip placeholder/template names like {WORKFLOW_CODE}
  if (!/^[a-z0-9_-]+$/i.test(slug)) {
    return null;
  }
  return { module: moduleName, slug: slug.toLowerCase(), title, instructionsPath, workflowPath: workflowYamlPath };
}

function resolveInstructionPath(baseYamlPath, raw) {
  // Handle common placeholder from repo YAML
  let v = raw.replace('{project-root}/', '');
  if (v.startsWith('/')) v = v.slice(1);
  // If now relative to repo root, join on repo root
  const repoRoot = resolveRepoRoot();
  const absFromRepo = path.join(repoRoot, v);
  if (fs.existsSync(absFromRepo)) return absFromRepo;
  // Else treat as relative to YAML folder
  return path.join(path.dirname(baseYamlPath), raw);
}

module.exports = {
  discoverWorkflows,
  resolveRepoRoot,
  resolveEmbeddedRoot,
  resolveEmbeddedPath,
  loadEmbeddedManifest,
};
