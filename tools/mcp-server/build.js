/*
BMAD MCP Server - Build System
Bundles workflows and agents into embedded/ directory for standalone packaging
*/

const fs = require('fs-extra');
const path = require('node:path');
const { glob } = require('glob');
const yaml = require('js-yaml');
const csv = require('csv-parse/sync');

// Paths
const REPO_ROOT = path.resolve(__dirname, '../..');
const EMBEDDED_ROOT = path.join(__dirname, 'embedded');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');

// Build state tracking
const buildState = {
  agents: [],
  workflows: [],
  copiedFiles: 0,
  errors: [],
  warnings: [],
  startTime: Date.now(),
};

/**
 * Main build orchestrator
 */
async function main() {
  const args = new Set(process.argv.slice(2));
  const clean = args.has('--clean');
  const force = args.has('--force');

  console.log('[bmad-mcp-build] 🚀 Starting BMAD MCP Server build...');
  console.log(`[bmad-mcp-build] Repository root: ${REPO_ROOT}`);
  console.log(`[bmad-mcp-build] Embedded target: ${EMBEDDED_ROOT}`);

  try {
    // Clean if requested
    if (clean) {
      await cleanEmbedded();
    }

    // Ensure embedded directory structure
    await ensureDirectories();

    // Copy agents
    console.log('[bmad-mcp-build] 📋 Copying agents...');
    await copyAgents(force);

    // Copy workflows
    console.log('[bmad-mcp-build] ⚙️  Copying workflows...');
    await copyWorkflows(force);

    // Generate manifest
    console.log('[bmad-mcp-build] 📦 Generating manifest...');
    await generateManifest();

    // Validate build
    console.log('[bmad-mcp-build] ✅ Validating build...');
    await validateBuild();

    // Print summary
    printSummary();

    console.log('[bmad-mcp-build] 🎉 Build complete!');
    process.exit(0);
  } catch (error) {
    console.error('[bmad-mcp-build] ❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Clean embedded directory
 */
async function cleanEmbedded() {
  console.log('[bmad-mcp-build] 🧹 Cleaning embedded directory...');
  await fs.remove(EMBEDDED_ROOT);
  console.log('[bmad-mcp-build] ✓ Cleaned embedded directory');
}

/**
 * Ensure directory structure exists
 */
async function ensureDirectories() {
  const dirs = [EMBEDDED_ROOT, path.join(EMBEDDED_ROOT, 'agents'), path.join(EMBEDDED_ROOT, 'workflows')];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
  console.log('[bmad-mcp-build] ✓ Created directory structure');
}

/**
 * Copy agents from bmad/ directory
 */
async function copyAgents(force) {
  const agentManifestPath = path.join(REPO_ROOT, 'bmad/_cfg/agent-manifest.csv');

  // Check if agent manifest exists
  if (!(await fs.pathExists(agentManifestPath))) {
    throw new Error(`Agent manifest not found: ${agentManifestPath}`);
  }

  // Copy agent manifest
  const targetManifestPath = path.join(EMBEDDED_ROOT, 'agents/agent-manifest.csv');
  await copyFileIfNewer(agentManifestPath, targetManifestPath, force);
  buildState.copiedFiles++;

  // Parse agent manifest to get agent list
  const manifestContent = await fs.readFile(agentManifestPath, 'utf8');
  const records = csv.parse(manifestContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`[bmad-mcp-build] Found ${records.length} agents in manifest`);

  // Copy each agent markdown file
  for (const record of records) {
    const sourcePath = path.join(REPO_ROOT, record.path);
    // Get just the filename (e.g., "analyst.md")
    const filename = path.basename(record.path);
    const targetPath = path.join(EMBEDDED_ROOT, 'agents', record.module, filename);

    if (!(await fs.pathExists(sourcePath))) {
      buildState.warnings.push(`Agent file not found: ${sourcePath}`);
      continue;
    }

    await fs.ensureDir(path.dirname(targetPath));
    await copyFileIfNewer(sourcePath, targetPath, force);
    buildState.copiedFiles++;

    // Store agent info for manifest (relative to embedded root)
    const embeddedPath = path.join('agents', record.module, filename).replaceAll('\\', '/');
    buildState.agents.push({
      name: record.name,
      displayName: record.displayName,
      module: record.module,
      embeddedPath,
    });
  }

  console.log(`[bmad-mcp-build] ✓ Copied ${buildState.agents.length} agents`);
}

/**
 * Copy workflows from src/core and src/modules
 */
async function copyWorkflows(force) {
  const workflowDirs = [path.join(REPO_ROOT, 'src/core/workflows'), path.join(REPO_ROOT, 'src/modules')];

  for (const baseDir of workflowDirs) {
    if (!(await fs.pathExists(baseDir))) {
      buildState.warnings.push(`Workflow directory not found: ${baseDir}`);
      continue;
    }

    // Find all workflow.yaml files
    const workflowFiles = await glob('**/workflow.yaml', {
      cwd: baseDir,
      absolute: false,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });

    console.log(`[bmad-mcp-build] Found ${workflowFiles.length} workflows in ${path.relative(REPO_ROOT, baseDir)}`);

    for (const workflowFile of workflowFiles) {
      const sourcePath = path.join(baseDir, workflowFile);
      const workflowDir = path.dirname(sourcePath);

      // Parse workflow.yaml to get metadata
      const workflowYaml = await fs.readFile(sourcePath, 'utf8');
      const workflow = yaml.load(workflowYaml);

      if (!workflow.name) {
        buildState.warnings.push(`Workflow missing name field: ${sourcePath}`);
        continue;
      }

      // Determine module from path
      let module = 'core';
      if (sourcePath.includes('/src/modules/')) {
        const moduleMatch = sourcePath.match(/\/src\/modules\/([^/]+)\//);
        if (moduleMatch) {
          module = moduleMatch[1];
        }
      }

      // Create target directory: embedded/workflows/{module}/{workflow-name}/
      const targetDir = path.join(EMBEDDED_ROOT, 'workflows', module, workflow.name);
      await fs.ensureDir(targetDir);

      // Copy workflow.yaml
      const targetWorkflowPath = path.join(targetDir, 'workflow.yaml');
      await copyFileIfNewer(sourcePath, targetWorkflowPath, force);
      buildState.copiedFiles++;

      // Copy instructions.md if it exists
      const instructionsPath = path.join(workflowDir, 'instructions.md');
      if (await fs.pathExists(instructionsPath)) {
        const targetInstructionsPath = path.join(targetDir, 'instructions.md');
        await copyFileIfNewer(instructionsPath, targetInstructionsPath, force);
        buildState.copiedFiles++;
      }

      // Copy any additional workflow files (templates, etc.)
      const workflowFiles = await glob('*.{md,yaml,yml,txt}', {
        cwd: workflowDir,
        absolute: false,
        ignore: ['workflow.yaml', 'instructions.md'],
      });

      for (const file of workflowFiles) {
        const sourceFile = path.join(workflowDir, file);
        const targetFile = path.join(targetDir, file);
        await copyFileIfNewer(sourceFile, targetFile, force);
        buildState.copiedFiles++;
      }

      // Store workflow info for manifest (relative to embedded root)
      const embeddedPath = path.join('workflows', module, workflow.name).replaceAll('\\', '/');
      buildState.workflows.push({
        module,
        slug: workflow.name,
        title: workflow.description || workflow.name,
        embeddedPath,
      });
    }
  }

  console.log(`[bmad-mcp-build] ✓ Copied ${buildState.workflows.length} workflows`);
}

/**
 * Generate manifest.json
 */
async function generateManifest() {
  // Get BMAD version from root package.json
  const packageJson = await fs.readJSON(PACKAGE_JSON_PATH);
  const bmadVersion = packageJson.version;

  const manifest = {
    version: '1.0.0',
    buildTime: new Date().toISOString(),
    bmadVersion,
    agents: buildState.agents.sort((a, b) => a.name.localeCompare(b.name)),
    workflows: buildState.workflows.sort((a, b) => {
      // Sort by module, then slug
      if (a.module !== b.module) {
        return a.module.localeCompare(b.module);
      }
      return a.slug.localeCompare(b.slug);
    }),
    stats: {
      totalAgents: buildState.agents.length,
      totalWorkflows: buildState.workflows.length,
      totalFiles: buildState.copiedFiles,
    },
  };

  const manifestPath = path.join(EMBEDDED_ROOT, 'manifest.json');
  await fs.writeJSON(manifestPath, manifest, { spaces: 2 });

  console.log(`[bmad-mcp-build] ✓ Generated manifest.json`);
  console.log(`[bmad-mcp-build]   - ${manifest.stats.totalAgents} agents`);
  console.log(`[bmad-mcp-build]   - ${manifest.stats.totalWorkflows} workflows`);
  console.log(`[bmad-mcp-build]   - ${manifest.stats.totalFiles} files`);
}

/**
 * Validate build output
 */
async function validateBuild() {
  const errors = [];

  // Check manifest exists
  const manifestPath = path.join(EMBEDDED_ROOT, 'manifest.json');
  if (await fs.pathExists(manifestPath)) {
    // Validate manifest structure
    const manifest = await fs.readJSON(manifestPath);

    if (!manifest.version) errors.push('Manifest missing version');
    if (!manifest.buildTime) errors.push('Manifest missing buildTime');
    if (!manifest.bmadVersion) errors.push('Manifest missing bmadVersion');
    if (!Array.isArray(manifest.agents)) errors.push('Manifest missing agents array');
    if (!Array.isArray(manifest.workflows)) errors.push('Manifest missing workflows array');

    // Check minimum agents (should have at least 10)
    if (manifest.agents.length < 10) {
      errors.push(`Only ${manifest.agents.length} agents found (expected at least 10)`);
    }

    // Check party-mode workflow exists
    const hasPartyMode = manifest.workflows.some((w) => w.slug === 'party-mode');
    if (!hasPartyMode) {
      errors.push('party-mode workflow not found in manifest');
    }

    // Verify all agent files exist
    for (const agent of manifest.agents) {
      const agentPath = path.join(EMBEDDED_ROOT, agent.embeddedPath);
      if (!(await fs.pathExists(agentPath))) {
        errors.push(`Agent file missing: ${agent.embeddedPath}`);
      }
    }

    // Verify all workflow directories exist
    for (const workflow of manifest.workflows) {
      const workflowDir = path.join(EMBEDDED_ROOT, workflow.embeddedPath);
      if (!(await fs.pathExists(workflowDir))) {
        errors.push(`Workflow directory missing: ${workflow.embeddedPath}`);
      }

      // Check workflow.yaml exists
      const workflowFile = path.join(workflowDir, 'workflow.yaml');
      if (!(await fs.pathExists(workflowFile))) {
        errors.push(`Workflow file missing: ${workflow.embeddedPath}/workflow.yaml`);
      }
    }
  } else {
    errors.push('manifest.json not generated');
  }

  if (errors.length > 0) {
    console.error('[bmad-mcp-build] ❌ Validation failed:');
    for (const err of errors) console.error(`  - ${err}`);
    throw new Error('Build validation failed');
  }

  console.log('[bmad-mcp-build] ✓ Validation passed');
}

/**
 * Copy file only if source is newer or force is true
 */
async function copyFileIfNewer(source, target, force) {
  if (force) {
    await fs.copy(source, target);
    return true;
  }

  // Check if target exists and compare timestamps
  if (await fs.pathExists(target)) {
    const sourceStat = await fs.stat(source);
    const targetStat = await fs.stat(target);

    if (sourceStat.mtime <= targetStat.mtime) {
      // Target is up to date
      return false;
    }
  }

  await fs.copy(source, target);
  return true;
}

/**
 * Print build summary
 */
function printSummary() {
  const duration = ((Date.now() - buildState.startTime) / 1000).toFixed(2);

  console.log('\n[bmad-mcp-build] 📊 Build Summary:');
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log(`  📁 Files copied: ${buildState.copiedFiles}`);
  console.log(`  👥 Agents: ${buildState.agents.length}`);
  console.log(`  ⚙️  Workflows: ${buildState.workflows.length}`);

  if (buildState.warnings.length > 0) {
    console.log(`  ⚠️  Warnings: ${buildState.warnings.length}`);
    for (const warn of buildState.warnings) console.log(`     - ${warn}`);
  }

  if (buildState.errors.length > 0) {
    console.log(`  ❌ Errors: ${buildState.errors.length}`);
    for (const err of buildState.errors) console.log(`     - ${err}`);
  }
}

// Run build
main();
