const path = require('node:path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

const { outputs, idForPath } = require('./resources');

async function handleCommand({ text, cwd, targetPath, inputs, dryRun, index, runWorkflow }) {
  const t = (text || '').trim();
  if (!t.startsWith('/')) {
    return { content: [{ type: 'text', text: 'Commands must start with /, e.g., /bmad:master' }] };
  }

  // Support patterns:
  // /bmad:master
  // /bmad:master *party-mode
  if (t.startsWith('/bmad:master')) {
    const rest = t.replace('/bmad:master', '').trim();
    if (!rest) {
      const persona = index.masterAgent?.persona || {};
      const menu = (index.masterAgent?.menu || []).map((m) => `- ${m.trigger} — ${m.description || ''}`).join('\n');
      const help = [
        `BMad Master Persona:`,
        persona.identity ? `Identity: ${persona.identity}` : '',
        persona.communication_style ? `Style: ${persona.communication_style}` : '',
        persona.principles ? `Principles: ${persona.principles}` : '',
        '',
        `Menu:`,
        menu || '(no menu found)',
      ]
        .filter(Boolean)
        .join('\n');
      return { content: [{ type: 'text', text: help }] };
    }

    // Trigger after master: expect "*party-mode" etc
    const trigger = rest.split(/\s+/)[0];
    if (trigger.startsWith('*')) {
      const slug = trigger.slice(1);
      // map to core workflow by slug
      const wf = index.workflows.find((w) => w.module === 'core' && w.slug === slug);
      if (!wf) {
        return { content: [{ type: 'text', text: `Unknown master trigger: ${trigger}` }] };
      }
      const res = await runWorkflow({ wf, cwd, inputs, targetPath, dryRun, writeDefault: true });
      const content = [{ type: 'text', text: res.summary + (res.path ? `\npath: ${res.path}` : '') }];
      if (res.path) {
        const id = idForPath(res.path);
        outputs.set(id, res.path);
        content.push({
          type: 'resource_link',
          uri: `bmad://output/${id}`,
          name: require('node:path').basename(res.path),
          mimeType: 'text/markdown',
          description: `${wf.module}/${wf.slug} prompt pack`,
        });
      }
      return { content, structuredContent: res };
    }

    return { content: [{ type: 'text', text: `Unsupported master command: ${rest}` }] };
  }

  return { content: [{ type: 'text', text: `Unknown command: ${text}` }] };
}

function pathToFileUri(p) {
  const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const prefix = process.platform === 'win32' ? 'file:///' : 'file://';
  return prefix + absolute.split(path.sep).map(encodeURIComponent).join('/');
}

module.exports = { handleCommand };
