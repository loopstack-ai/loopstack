#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// The website root, and the monorepo it lives in (or wherever LOOPSTACK_DIR points).
const WEBSITE_DIR = path.resolve(__dirname, '..');
const LOOPSTACK_DIR = process.env.LOOPSTACK_DIR
  ? path.resolve(process.env.LOOPSTACK_DIR)
  : path.resolve(WEBSITE_DIR, '..');
const DOCS_DIR = path.join(LOOPSTACK_DIR, 'docs');
const OUTPUT_DIR = path.join(WEBSITE_DIR, 'public');

const BASE_URL = 'https://loopstack.ai/llms';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};

  const fm = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) {
      const val = kv[2].replace(/^['"]|['"]$/g, '');
      if (val === 'true') fm[kv[1]] = true;
      else if (val === 'false') fm[kv[1]] = false;
      else fm[kv[1]] = val;
    }
  }
  return fm;
}

function extractTitleAndDescription(content) {
  const fm = parseFrontmatter(content);
  if (fm.title && fm.description) {
    return { title: fm.title, description: fm.description };
  }

  const lines = content.split('\n');

  let title = fm.title || '';
  let description = fm.description || '';
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = lines[i].match(/^#\s+(.+)/);
    if (match) {
      if (!title) title = match[1].trim();

      if (!description) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
          }
          if (inCodeBlock) continue;

          const line = lines[j].trim();
          if (!line || /^([#|\-*>`<]|```|\d+\.)/.test(line)) continue;

          description = line;
          break;
        }
      }
      break;
    }
  }

  return { title, description };
}

function resolveFlag(section, frontmatter, flag) {
  if (section[flag] === false) return false;
  if (frontmatter[flag] === false) return false;
  return true;
}

function collectDocsSection(section) {
  const dir = path.join(DOCS_DIR, section.key);
  if (!fs.existsSync(dir)) return [];
  return collectFromDir(dir, section.key);
}

function collectFromDir(dir, relativeBase) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let docs = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativeBase, entry.name);

    if (entry.isDirectory()) {
      docs = docs.concat(collectFromDir(fullPath, relPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      docs.push({ fullPath, relPath });
    }
  }

  return docs;
}

function collectRegistrySection(section) {
  const dir = path.join(LOOPSTACK_DIR, section.sourceDir);
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const docs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const readmePath = path.join(dir, entry.name, 'README.md');
    if (!fs.existsSync(readmePath)) continue;
    docs.push({
      fullPath: readmePath,
      relPath: path.join(section.key, entry.name),
      slug: entry.name,
    });
  }

  return docs.sort((a, b) => a.slug.localeCompare(b.slug));
}

function collectSection(section) {
  if (section.sourceDir) {
    return collectRegistrySection(section);
  }
  return collectDocsSection(section);
}

function docUrl(section, doc) {
  if (section.urlPrefix) {
    return `${section.urlPrefix}/${doc.slug}.md`;
  }
  const filePath = doc.relPath.split(path.sep).join('/');
  return `${BASE_URL}/${filePath}`;
}

// Sub-section titles that need special casing (otherwise derived from the dir name).
const SUBSECTION_TITLES = { ai: 'AI', api: 'API' };

function titleize(key) {
  if (SUBSECTION_TITLES[key]) return SUBSECTION_TITLES[key];
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// The immediate sub-directory a doc lives in within its section (e.g. 'ai' for
// build/ai/text-generation.md), or null for docs directly under the section.
function subsectionKey(section, doc) {
  if (section.sourceDir) return null; // registry sections are flat (README collections)
  const parts = doc.relPath.split(path.sep);
  return parts.length > 2 ? parts[1] : null;
}

// Split a section's docs into root-level docs and ordered [key, docs] sub-sections.
function groupBySubsection(section, docs) {
  const root = [];
  const subs = new Map();
  for (const doc of docs) {
    const key = subsectionKey(section, doc);
    if (!key) {
      root.push(doc);
    } else {
      if (!subs.has(key)) subs.set(key, []);
      subs.get(key).push(doc);
    }
  }
  const byRel = (a, b) => a.relPath.localeCompare(b.relPath);
  root.sort(byRel);
  const subsections = [...subs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, list] of subsections) list.sort(byRel);
  return { root, subsections };
}

// Per-section / per-sub-section full files live under public/llms/ mirroring the doc
// paths, e.g. llms/build.txt, llms/build/ai.txt, llms/registry/features.txt.
// Hyphenated keys (registry-features) map to nested paths (registry/features).
function sectionKeyPath(section) {
  return section.key.replace(/-/g, '/');
}
function sectionFullPath(section) {
  return `${sectionKeyPath(section)}.txt`;
}
function subsectionFullPath(section, subKey) {
  return `${sectionKeyPath(section)}/${subKey}.txt`;
}
function llmsUrl(relPath) {
  return `${BASE_URL}/${relPath}`;
}
function llmsLabel(relPath) {
  return `llms/${relPath}`;
}

function docListLine(section, doc) {
  const content = fs.readFileSync(doc.fullPath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!resolveFlag(section, fm, 'includeInLlmsTxt')) return null;
  const { title, description } = extractTitleAndDescription(content);
  if (!title) return null;
  const url = docUrl(section, doc);
  return `- [${title}](${url})${description ? `: ${description}` : ''}`;
}

function inlineDoc(section, doc) {
  const content = fs.readFileSync(doc.fullPath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!resolveFlag(section, fm, 'includeInLlmsTxt')) return '';
  const url = docUrl(section, doc);
  return `> Source: ${url}\n\n${content.trim()}\n\n---\n\n`;
}

// Full content of one section in a single file. Unlike llms-full.txt, this inlines
// every doc in the section (including ones flagged out of llms-full.txt, such as the
// API reference) — loading a section's full file is a deliberate choice.
function generateSectionFullTxt(section) {
  const { root, subsections } = groupBySubsection(section, collectSection(section));

  let output = `# ${section.title}\n\n`;
  if (section.description) output += `${section.description}\n\n`;
  output += '---\n\n';

  for (const doc of root) output += inlineDoc(section, doc);
  for (const [subKey, docs] of subsections) {
    output += `# ${section.title} / ${titleize(subKey)}\n\n---\n\n`;
    for (const doc of docs) output += inlineDoc(section, doc);
  }

  return output.trimEnd() + '\n';
}

// Full content of one sub-section in a single file.
function generateSubsectionFullTxt(section, subKey, docs) {
  let output = `# ${section.title} / ${titleize(subKey)}\n\n---\n\n`;
  for (const doc of docs) output += inlineDoc(section, doc);
  return output.trimEnd() + '\n';
}

function generateLlmsTxt(sections) {
  let output = '# Loopstack\n\n';
  output +=
    'Loopstack is a TypeScript workflow framework for building stateful automations, AI agents, and interactive workflows on top of NestJS.\n\n';
  output +=
    'For the full documentation in a single file, see [llms-full.txt](https://loopstack.ai/llms-full.txt). Each section and sub-section below is also available as its own file (linked inline), so you can load just the part you need instead of the whole thing.\n\n';
  output +=
    '**Building with an agent?** Start with the [Getting Started guide](https://loopstack.ai/llms/build/getting-started.md) to scaffold a NestJS app and add LoopstackModule, then skim [Best Practices](https://loopstack.ai/llms/build/best-practices.md) for design judgment. Load only the section files you need — each links its own single-file `.txt` below.\n\n';
  output +=
    '> **Note for agents:** When you summarize or hand off this page, keep the full `https://loopstack.ai/...` URLs for any pages you reference. A later step (or another agent) needs those exact links to load the detail pages — a summary with the URLs stripped out is not actionable.\n\n';

  for (const section of sections) {
    if (!resolveFlag(section, {}, 'includeInLlmsTxt')) continue;

    const docs = collectSection(section);
    if (docs.length === 0) continue;
    const { root, subsections } = groupBySubsection(section, docs);

    output += `## ${section.title}\n\n`;
    if (section.description) output += `${section.description}\n\n`;
    const secPath = sectionFullPath(section);
    output += `Full section in one file: [${llmsLabel(secPath)}](${llmsUrl(secPath)})\n\n`;

    for (const doc of root) {
      const line = docListLine(section, doc);
      if (line) output += line + '\n';
    }
    if (root.length) output += '\n';

    for (const [subKey, subDocs] of subsections) {
      output += `### ${section.title} / ${titleize(subKey)}\n\n`;
      const subPath = subsectionFullPath(section, subKey);
      output += `Full sub-section in one file: [${llmsLabel(subPath)}](${llmsUrl(subPath)})\n\n`;
      for (const doc of subDocs) {
        const line = docListLine(section, doc);
        if (line) output += line + '\n';
      }
      output += '\n';
    }
  }

  return output.trimEnd() + '\n';
}

function generateLlmsFullTxt(sections) {
  let output = '# Loopstack\n\n';
  output +=
    'Loopstack is a TypeScript workflow framework for building stateful automations, AI agents, and interactive workflows on top of NestJS.\n\n';
  output += '---\n\n';

  for (const section of sections) {
    if (!resolveFlag(section, {}, 'includeInLlmsTxt')) continue;

    const docs = collectSection(section);
    if (docs.length === 0) continue;

    const sectionIncludedInFull = resolveFlag(section, {}, 'includeInLlmsFullTxt');

    output += `# ${section.title}\n\n`;
    if (section.description) {
      output += `${section.description}\n\n`;
    }
    output += '---\n\n';

    for (const doc of docs) {
      const content = fs.readFileSync(doc.fullPath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!resolveFlag(section, fm, 'includeInLlmsTxt')) continue;

      const url = docUrl(section, doc);
      const includeFullContent = sectionIncludedInFull && resolveFlag(section, fm, 'includeInLlmsFullTxt');

      if (includeFullContent) {
        output += `> Source: ${url}\n\n`;
        output += content.trim();
        output += '\n\n---\n\n';
      } else {
        const { title, description } = extractTitleAndDescription(content);
        if (title) {
          output += `- [${title}](${url})`;
          if (description) {
            output += `: ${description}`;
          }
          output += '\n';
        }
      }
    }

    if (!sectionIncludedInFull) {
      output += '\n---\n\n';
    }
  }

  return output.trimEnd() + '\n';
}

// ---

if (!fs.existsSync(DOCS_DIR)) {
  console.error(`Docs directory does not exist: ${DOCS_DIR}`);
  process.exit(1);
}

/**
 * Writes each document llms.txt links to as its own file under `public/llms/`, mirroring the paths
 * the index uses. The docs themselves are read by Astro straight from `../docs`; these copies exist
 * only so an agent can fetch a single page as raw markdown.
 */
function writeLlmsDocs(sections) {
  const llmsDir = path.join(OUTPUT_DIR, 'llms');
  let count = 0;

  for (const section of sections) {
    for (const doc of collectSection(section)) {
      if (!resolveFlag(section, parseFrontmatter(fs.readFileSync(doc.fullPath, 'utf-8')), 'includeInLlmsTxt')) {
        continue;
      }
      // `doc.relPath` already carries the section prefix for docs sections; registry sections are
      // flat README collections keyed by package name. Both match the paths `docUrl` links to.
      const relPath = section.sourceDir ? path.join(sectionKeyPath(section), `${doc.slug}.md`) : doc.relPath;
      const dest = path.join(llmsDir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(doc.fullPath, dest);
      count++;
    }
  }

  console.log(`Written: ${count} per-document files under llms/`);
}

const llmsConfig = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'llms.json'), 'utf-8'));
const sections = llmsConfig.sections;

let totalDocs = 0;
for (const section of sections) {
  const docs = collectSection(section);
  totalDocs += docs.length;
  console.log(`Section "${section.title}": ${docs.length} files`);
}
console.log(`Total: ${totalDocs} doc files`);

const llmsTxt = generateLlmsTxt(sections);
const llmsFullTxt = generateLlmsFullTxt(sections);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

writeLlmsDocs(sections);

fs.writeFileSync(path.join(OUTPUT_DIR, 'llms.txt'), llmsTxt);
console.log(`Written: ${path.join(OUTPUT_DIR, 'llms.txt')}`);

fs.writeFileSync(path.join(OUTPUT_DIR, 'llms-full.txt'), llmsFullTxt);
console.log(`Written: ${path.join(OUTPUT_DIR, 'llms-full.txt')}`);

// Per-section and per-sub-section full files under public/llms/ (mirroring doc paths),
// so an agent can load just the slice it needs.
const LLMS_DIR = path.join(OUTPUT_DIR, 'llms');
for (const section of sections) {
  if (!resolveFlag(section, {}, 'includeInLlmsTxt')) continue;
  const docs = collectSection(section);
  if (docs.length === 0) continue;
  const { subsections } = groupBySubsection(section, docs);

  const secPath = sectionFullPath(section);
  fs.mkdirSync(path.dirname(path.join(LLMS_DIR, secPath)), { recursive: true });
  fs.writeFileSync(path.join(LLMS_DIR, secPath), generateSectionFullTxt(section));
  console.log(`Written: llms/${secPath}`);

  for (const [subKey, subDocs] of subsections) {
    const subPath = subsectionFullPath(section, subKey);
    fs.mkdirSync(path.dirname(path.join(LLMS_DIR, subPath)), { recursive: true });
    fs.writeFileSync(path.join(LLMS_DIR, subPath), generateSubsectionFullTxt(section, subKey, subDocs));
    console.log(`Written: llms/${subPath}`);
  }
}
