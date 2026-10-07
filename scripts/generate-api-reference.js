#!/usr/bin/env node

/**
 * Generates an LLM- and human-readable API reference for the Loopstack
 * "authoring surface" — the public API a workflow/tool author needs.
 *
 * Only symbols tagged with the `@public` JSDoc tag are included, so the
 * framework's internals stay out of the reference. For each symbol we emit:
 *   - the import statement (derived from the package's `exports` map)
 *   - the providing NestJS module, when tagged with `@providedBy <Module>`
 *   - the body-less signature (read from the built `.d.ts`)
 *
 * Output is one markdown file per package under the configured `outputDir`
 * (inside `loopstack/docs/`), so the existing doc pipeline mirrors it to the
 * website (sync-docs.js) and into the LLM files (generate-llms-txt.js).
 *
 * The reference is built from each package's TypeScript source: the script
 * compiles it and emits declarations in memory with JSDoc preserved (the repo
 * build sets `removeComments: true`, which strips tags from the on-disk
 * `.d.ts`). Packages do NOT need to be pre-built.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'api-reference.config.json');

// Resolve the TypeScript compiler API from the loopstack workspace so this
// script stays dependency-free at the repo root.
const ts = require(require.resolve('typescript', { paths: [ROOT_DIR] }));

const KIND_SECTIONS = [
  { kind: ts.SyntaxKind.ClassDeclaration, title: 'Classes' },
  { kind: ts.SyntaxKind.InterfaceDeclaration, title: 'Interfaces' },
  { kind: ts.SyntaxKind.TypeAliasDeclaration, title: 'Type Aliases' },
  { kind: ts.SyntaxKind.EnumDeclaration, title: 'Enums' },
  { kind: ts.SyntaxKind.FunctionDeclaration, title: 'Functions' },
  { kind: ts.SyntaxKind.VariableDeclaration, title: 'Variables' },
];

function resolveAlias(symbol, checker) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function jsDocText(text) {
  // TS may give `@providedBy` tag text as a string or as display parts.
  if (typeof text === 'string') return text.trim();
  if (Array.isArray(text)) return ts.displayPartsToString(text).trim();
  return '';
}

/** Strip embedded code fences from a JSDoc description so they can't break the page. */
function cleanDescription(text) {
  return (
    text
      .replace(/```[\s\S]*?```/g, '') // remove complete fenced code blocks
      // TS truncates a doc comment at the first `@tag` — an example fence containing
      // e.g. `@Tool(...)` loses its closing ```, leaving an unterminated fence. Drop
      // from that orphan opener to the end so its code never leaks out as prose.
      .replace(/```[\s\S]*$/g, '')
      .replace(/`{3,}\w*/g, '') // remove any orphan fence markers
      .replace(/\{@link(?:code|plain)?\s+([^}|]+?)(?:\|[^}]*)?\}/g, '`$1`') // {@link X} -> `X`
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/** Turn a declaration into a clean, comment-free signature for the reference. */
function cleanSignature(text) {
  return text
    .replace(/\/\*\*[\s\S]*?\*\//g, '') // strip JSDoc blocks (we render descriptions separately)
    .replace(/^(\s*export\s+)declare\s+/, '$1') // drop `.d.ts`-only `declare`
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '') // drop blank lines left by comment removal
    .filter((line) => !/^\s*private\s/.test(line)) // hide private members
    .join('\n')
    .trim();
}

/**
 * Compile a package's source and emit its declarations into an in-memory file
 * system, with JSDoc preserved. Emitted paths match the package's real `dist`
 * paths, so they line up with the `exports` map.
 */
function emitDeclarations(pkgDir) {
  const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
  const parseHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    },
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, parseHost);
  const options = {
    ...parsed.options,
    declaration: true,
    emitDeclarationOnly: true,
    removeComments: false,
    declarationMap: false,
    composite: false,
    incremental: false,
    noEmit: false,
  };

  const vfs = new Map();
  const program = ts.createProgram({ rootNames: parsed.fileNames, options });
  program.emit(
    undefined,
    (fileName, data) => vfs.set(path.resolve(fileName), data),
    undefined,
    true, // emitOnlyDtsFiles
    undefined, // customTransformers
    true, // forceDtsEmit — emit declarations even when the cross-package type graph has gaps
  );
  return { vfs, options };
}

/** A compiler host that serves emitted declarations from memory, disk otherwise. */
function createVfsHost(vfs, options) {
  const host = ts.createCompilerHost(options);
  const original = {
    getSourceFile: host.getSourceFile.bind(host),
    readFile: host.readFile.bind(host),
    fileExists: host.fileExists.bind(host),
  };
  host.fileExists = (f) => vfs.has(path.resolve(f)) || original.fileExists(f);
  host.readFile = (f) => (vfs.has(path.resolve(f)) ? vfs.get(path.resolve(f)) : original.readFile(f));
  host.getSourceFile = (f, languageVersion, onError) => {
    const key = path.resolve(f);
    if (vfs.has(key)) return ts.createSourceFile(f, vfs.get(key), languageVersion, true);
    return original.getSourceFile(f, languageVersion, onError);
  };
  return host;
}

/** Read one module entry point (an emitted `.d.ts`) and collect its `@public` exports. */
function collectFromEntry(vfs, options, dtsPath, importPath) {
  const host = createVfsHost(vfs, options);
  const program = ts.createProgram({ rootNames: [dtsPath], options, host });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(dtsPath);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];

  const collected = [];
  for (const rawSymbol of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveAlias(rawSymbol, checker);
    const tags = symbol.getJsDocTags(checker);
    if (!tags.some((t) => t.name === 'public')) continue;

    const declarations = symbol.getDeclarations() || [];
    if (declarations.length === 0) continue;

    const primary = declarations[0];
    const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
    const providedByTag = tags.find((t) => t.name === 'providedBy');
    const providedBy = providedByTag ? jsDocText(providedByTag.text) : '';

    const signature = declarations.map((d) => cleanSignature(d.getText(d.getSourceFile()))).join('\n');

    collected.push({
      name: rawSymbol.getName(),
      kind: primary.kind,
      importPath,
      description,
      providedBy,
      signature,
    });
  }
  return collected;
}

/** Resolve a package's public entry points from its `exports` / `types` map. */
function getEntryPoints(pkgDir, pkg) {
  const entries = [];
  if (pkg.exports && typeof pkg.exports === 'object') {
    for (const [subpath, value] of Object.entries(pkg.exports)) {
      const typesFile = value && typeof value === 'object' ? value.types : null;
      if (!typesFile) continue;
      const importPath = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, '')}`;
      entries.push({ importPath, dts: path.join(pkgDir, typesFile) });
    }
  } else if (pkg.types || pkg.typings) {
    entries.push({ importPath: pkg.name, dts: path.join(pkgDir, pkg.types || pkg.typings) });
  }
  return entries;
}

function renderMarkdown(pkg, symbols) {
  const title = `API: ${pkg.name}`;
  const description = `Public API reference for ${pkg.name}`;

  const lines = [];
  lines.push('---');
  lines.push(`title: "${title}"`);
  lines.push(`description: "${description}"`);
  // Keep the (repetitive, signature-heavy) API reference out of the inlined
  // llms-full.txt — it appears there as a link and stays fully browsable as its
  // own page and in the llms.txt index.
  lines.push('includeInLlmsFullTxt: false');
  lines.push('---');
  lines.push('');
  lines.push(`# ${title}`);
  lines.push('');

  if (symbols.length === 0) {
    lines.push('_No `@public` symbols are exported from this package yet._');
    lines.push('');
    return lines.join('\n');
  }

  for (const section of KIND_SECTIONS) {
    const inSection = symbols.filter((s) => s.kind === section.kind).sort((a, b) => a.name.localeCompare(b.name));
    if (inSection.length === 0) continue;

    lines.push(`## ${section.title}`);
    lines.push('');
    for (const sym of inSection) {
      lines.push(`### ${sym.name}`);
      lines.push('');
      const description = cleanDescription(sym.description);
      if (description) {
        lines.push(description);
        lines.push('');
      }
      lines.push(`\`\`\`ts`);
      lines.push(`import { ${sym.name} } from '${sym.importPath}';`);
      lines.push(`\`\`\``);
      lines.push('');
      if (sym.providedBy) {
        lines.push(`**Provided by:** \`${sym.providedBy}\``);
        lines.push('');
      }
      lines.push(`\`\`\`ts`);
      lines.push(sym.signature);
      lines.push(`\`\`\``);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const outputDir = path.join(ROOT_DIR, config.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Generating API reference -> ${outputDir}`);

  for (const relPkgDir of config.packages) {
    const pkgDir = path.join(ROOT_DIR, relPkgDir);
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      console.warn(`  ! skipped ${relPkgDir} — no package.json`);
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const entries = getEntryPoints(pkgDir, pkg);

    const { vfs, options } = emitDeclarations(pkgDir);

    const symbols = [];
    for (const entry of entries) {
      const dtsPath = path.resolve(entry.dts);
      if (!vfs.has(dtsPath)) {
        console.warn(`  ! ${pkg.name}: no emitted declarations for ${path.relative(ROOT_DIR, entry.dts)}`);
        continue;
      }
      symbols.push(...collectFromEntry(vfs, options, dtsPath, entry.importPath));
    }

    const shortName = pkg.name.replace(/^@loopstack\//, '');
    const outFile = path.join(outputDir, `${shortName}.md`);
    fs.writeFileSync(outFile, renderMarkdown(pkg, symbols), 'utf8');
    console.log(`  ${pkg.name}: ${symbols.length} @public symbol(s) -> ${path.relative(ROOT_DIR, outFile)}`);
  }

  console.log('Done.');
}

main();
