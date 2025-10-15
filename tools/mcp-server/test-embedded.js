/**
 * Test script for embedded discovery system
 * Validates that workflows load correctly from embedded manifest
 */

const { discoverWorkflows, loadEmbeddedManifest, resolveEmbeddedPath } = require('./lib/discovery');
const fs = require('fs-extra');

async function main() {
  console.log('=== BMAD MCP Embedded Discovery Test ===\n');

  try {
    // Test 1: Load manifest
    console.log('Test 1: Loading embedded manifest...');
    const manifest = await loadEmbeddedManifest();
    console.log(`✓ Loaded manifest v${manifest.version}`);
    console.log(`  - ${manifest.agents.length} agents`);
    console.log(`  - ${manifest.workflows.length} workflows`);
    console.log(`  - Build time: ${manifest.buildTime}\n`);

    // Test 2: Discover workflows
    console.log('Test 2: Discovering workflows...');
    const index = await discoverWorkflows();
    console.log(`✓ Discovered ${index.workflows.length} workflows`);
    console.log(`  - srcRoot: ${index.srcRoot}`);
    console.log(`  - ${index.agents.length} agents available\n`);

    // Test 3: Verify party-mode workflow
    console.log('Test 3: Verifying party-mode workflow...');
    const partyMode = index.workflows.find((w) => w.module === 'core' && w.slug === 'party-mode');
    if (!partyMode) {
      throw new Error('party-mode workflow not found');
    }
    console.log(`✓ Found party-mode workflow`);
    console.log(`  - Title: ${partyMode.title}`);
    console.log(`  - Instructions: ${partyMode.instructionsPath}`);
    console.log(`  - Workflow: ${partyMode.workflowPath || 'N/A'}\n`);

    // Test 4: Verify files exist
    console.log('Test 4: Verifying embedded files exist...');
    if (partyMode.instructionsPath) {
      const instructionsExist = await fs.pathExists(partyMode.instructionsPath);
      if (!instructionsExist) {
        throw new Error(`Instructions file not found: ${partyMode.instructionsPath}`);
      }
      const instructionsContent = await fs.readFile(partyMode.instructionsPath, 'utf8');
      console.log(`✓ Instructions file exists (${instructionsContent.length} bytes)`);
    }

    if (partyMode.workflowPath) {
      const workflowExist = await fs.pathExists(partyMode.workflowPath);
      if (!workflowExist) {
        throw new Error(`Workflow file not found: ${partyMode.workflowPath}`);
      }
      console.log(`✓ Workflow file exists`);
    }

    // Test 5: Path security
    console.log('\nTest 5: Testing path security...');
    try {
      resolveEmbeddedPath('../../../etc/passwd');
      console.log('✗ Security check failed - path traversal not blocked');
      process.exit(1);
    } catch (error) {
      console.log(`✓ Path traversal blocked: ${error.message}`);
    }

    // Test 6: Sample workflows by module
    console.log('\nTest 6: Workflow distribution by module...');
    const byModule = {};
    for (const wf of index.workflows) {
      byModule[wf.module] = (byModule[wf.module] || 0) + 1;
    }
    for (const [module, count] of Object.entries(byModule).sort()) {
      console.log(`  - ${module}: ${count} workflows`);
    }

    console.log('\n=== ALL TESTS PASSED ✓ ===');
    process.exit(0);
  } catch (error) {
    console.error('\n=== TEST FAILED ✗ ===');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
