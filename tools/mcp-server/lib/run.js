const path = require('node:path');
const fs = require('fs-extra');

async function runWorkflow({ wf, cwd, inputs, targetPath, dryRun, writeDefault }) {
  const now = new Date();
  const stamp = now.toISOString().replaceAll(/[:.]/g, '-');
  const baseDir = path.resolve(cwd || process.cwd());
  const defaultDir = path.join(baseDir, 'docs', 'bmad', wf.module);
  const defName = `${wf.slug}-${stamp}.md`;
  const candidatePath = targetPath
    ? path.isAbsolute(targetPath)
      ? targetPath
      : path.join(baseDir, targetPath)
    : path.join(defaultDir, defName);
  const outPath = path.resolve(candidatePath);
  const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;
  if (!outPath.startsWith(baseWithSep)) {
    throw new Error(`Refusing to write outside cwd. targetPath must be within ${baseDir}`);
  }

  // Build prompt pack content
  const content = await buildPromptPack({ wf, cwd: baseDir, inputs });

  if (!dryRun && writeDefault) {
    await fs.ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, content, 'utf8');
  }

  const summary = `BMAD ${wf.module}/${wf.slug} ${dryRun ? 'prepared (dry-run)' : 'written'} at ${outPath}`;
  return { path: dryRun ? null : outPath, bytes: Buffer.byteLength(content, 'utf8'), summary, module: wf.module, slug: wf.slug };
}

async function buildPromptPack({ wf, cwd, inputs }) {
  const lines = [];
  lines.push('<!-- bmad.prompt.v1 -->', `# ${wf.title || `${wf.module}/${wf.slug}`}`, '');

  // Context from target repo
  const pkgPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      lines.push(
        '## Context: package.json',
        '```json',
        JSON.stringify({ name: pkg.name, version: pkg.version, description: pkg.description }, null, 2),
        '```',
        '',
      );
    } catch {
      // Ignore invalid package.json
    }
  }

  const readmePath = path.join(cwd, 'README.md');
  if (await fs.pathExists(readmePath)) {
    const readme = await fs.readFile(readmePath, 'utf8');
    const snippet = readme.split('\n').slice(0, 30).join('\n');
    lines.push('## Context: README excerpt', '```md', snippet, '```', '');
  }

  // Inputs
  lines.push('## Inputs', '```json', JSON.stringify(inputs || {}, null, 2), '```', '');

  // Instructions content (verbatim include)
  if (wf.instructionsPath) {
    lines.push('## Instructions');
    const instr = await fs.readFile(wf.instructionsPath, 'utf8');
    lines.push(instr.trim(), '');
  }

  // Next steps hint
  lines.push(
    '---',
    'Next Steps:',
    '- Use this file as the working canvas and draft the output here.',
    '- If another workflow is recommended by the instructions, trigger it via the MCP tools or /bmad command.',
    '',
  );

  return lines.join('\n');
}

module.exports = { runWorkflow, writePromptPack: buildPromptPack };
