import { execFile } from 'child_process';
import { Request, Router } from 'express';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { WORKSPACE_ROOT, resolveSafePath } from '../config';

const router = Router();

// POST /files/write
router.post('/write', async (req: Request, res) => {
  try {
    const { path: filePath, content } = req.body as { path?: string; content?: string };

    if (!filePath || content === undefined) {
      res.status(400).json({ error: 'Missing required fields: path, content' });
      return;
    }

    const safePath = resolveSafePath(filePath);

    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, 'utf-8');

    res.json({ success: true, path: filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`File write error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /files/read
router.get('/read', async (req: Request, res) => {
  try {
    const filePath = req.query.path as string | undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (!filePath) {
      res.status(400).json({ error: 'Missing required query parameter: path' });
      return;
    }

    const safePath = resolveSafePath(filePath);
    const fullContent = await fs.readFile(safePath, 'utf-8');

    let content = fullContent;
    if (offset !== undefined || limit !== undefined) {
      const lines = fullContent.split('\n');
      const startIndex = offset ? offset - 1 : 0;
      const endIndex = limit !== undefined ? startIndex + limit : lines.length;
      content = lines.slice(startIndex, endIndex).join('\n');
    }

    res.json({ content, path: filePath });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`File read error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /files/edit
router.post('/edit', async (req: Request, res) => {
  try {
    const {
      path: filePath,
      old_string,
      new_string,
      replace_all,
    } = req.body as {
      path?: string;
      old_string?: string;
      new_string?: string;
      replace_all?: boolean;
    };

    if (!filePath || old_string === undefined || new_string === undefined) {
      res.status(400).json({ error: 'Missing required fields: path, old_string, new_string' });
      return;
    }

    const safePath = resolveSafePath(filePath);
    const content = await fs.readFile(safePath, 'utf-8');

    // Count occurrences
    let count = 0;
    let searchIndex = 0;
    while ((searchIndex = content.indexOf(old_string, searchIndex)) !== -1) {
      count++;
      searchIndex += old_string.length;
    }

    if (count === 0) {
      res.status(400).json({ error: 'old_string not found in file' });
      return;
    }

    if (!replace_all && count > 1) {
      res.status(400).json({
        error: `old_string is not unique (found ${count} occurrences). Use replace_all: true or provide more context.`,
      });
      return;
    }

    const newContent = replace_all
      ? content.split(old_string).join(new_string)
      : content.replace(old_string, new_string);
    const replacements = replace_all ? count : 1;

    await fs.writeFile(safePath, newContent, 'utf-8');
    res.json({ success: true, path: filePath, replacements });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`File edit error: ${message}`);
    res.status(500).json({ error: message });
  }
});

interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

const TREE_IGNORE = new Set(['node_modules', '.git', 'dist']);

router.get('/tree', async (req: Request, res) => {
  try {
    const basePath = (req.query.path as string) || '.';
    const safePath = resolveSafePath(basePath);

    async function walk(dir: string): Promise<FileTreeNode[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const sorted = entries
        .filter((e) => !TREE_IGNORE.has(e.name) && !e.name.startsWith('.'))
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      const nodes: FileTreeNode[] = [];
      for (const entry of sorted) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(WORKSPACE_ROOT, fullPath);

        if (entry.isDirectory()) {
          nodes.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            type: 'folder',
            children: await walk(fullPath),
          });
        } else {
          nodes.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            type: 'file',
          });
        }
      }
      return nodes;
    }

    const stat = await fs.stat(safePath);
    if (!stat.isDirectory()) {
      res.status(400).json({ error: 'Path is not a directory' });
      return;
    }

    res.json(await walk(safePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'Path not found' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`File tree error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /files/glob
router.post('/glob', async (req: Request, res) => {
  try {
    const { pattern, path: searchPath } = req.body as { pattern?: string; path?: string };

    if (!pattern) {
      res.status(400).json({ error: 'Missing required field: pattern' });
      return;
    }

    const cwd = searchPath ? resolveSafePath(searchPath) : WORKSPACE_ROOT;

    const files = await glob(pattern, {
      cwd,
      nodir: true,
      dot: false,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });

    files.sort();
    res.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Glob error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /files/grep
router.post('/grep', async (req: Request, res) => {
  try {
    const {
      pattern,
      path: searchPath,
      glob: fileGlob,
      type,
      case_insensitive,
    } = req.body as {
      pattern?: string;
      path?: string;
      glob?: string;
      type?: string;
      case_insensitive?: boolean;
    };

    if (!pattern) {
      res.status(400).json({ error: 'Missing required field: pattern' });
      return;
    }

    const cwd = searchPath ? resolveSafePath(searchPath) : WORKSPACE_ROOT;

    const grepArgs: string[] = ['-rn', '--color=never'];

    if (case_insensitive) {
      grepArgs.push('-i');
    }

    // File type / glob filtering
    const typeToGlob: Record<string, string> = {
      js: '*.js',
      ts: '*.ts',
      tsx: '*.tsx',
      jsx: '*.jsx',
      json: '*.json',
      css: '*.css',
      html: '*.html',
      py: '*.py',
      yaml: '*.yaml',
      yml: '*.yml',
    };
    const includePattern = fileGlob || (type ? typeToGlob[type] : undefined);
    if (includePattern) {
      grepArgs.push(`--include=${includePattern}`);
    }

    grepArgs.push('--exclude-dir=node_modules', '--exclude-dir=.git', '--exclude-dir=dist');
    grepArgs.push('-E', '--', pattern, '.');

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      execFile('grep', grepArgs, { cwd, timeout: 15_000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        const exitCode = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode,
        });
      });
    });

    // grep exit code 1 = no matches (not an error)
    if (result.exitCode > 1) {
      res.status(500).json({ error: result.stderr || 'grep failed' });
      return;
    }

    const matches = result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^\.\/(.+?):(\d+):(.*)$/);
        if (!match) return null;
        return { file: match[1], line: Number(match[2]), content: match[3] };
      })
      .filter((m): m is { file: string; line: number; content: string } => m !== null);

    res.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Grep error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
