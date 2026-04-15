import { exec } from 'child_process';
import { Request, Router } from 'express';
import * as path from 'path';
import { WORKSPACE_ROOT } from '../config';

const router = Router();
const EXEC_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS) || 30_000;

router.post('/', async (req: Request, res) => {
  try {
    const { command, cwd } = req.body as { command?: string; cwd?: string };

    if (!command) {
      res.status(400).json({ error: 'Missing required field: command' });
      return;
    }

    const workingDir = cwd ? path.resolve(WORKSPACE_ROOT, cwd) : WORKSPACE_ROOT;
    console.log(`[exec] cwd=${workingDir} command=${command.substring(0, 200)}`);

    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      exec(
        command,
        {
          cwd: workingDir,
          timeout: EXEC_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        },
        (error, stdout, stderr) => {
          if (error) {
            console.log(
              `[exec] error: code=${error.code} killed=${error.killed} signal=${error.signal} message=${error.message?.substring(0, 200)}`,
            );
          }
          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode,
          });
        },
      );
    });

    console.log(
      `[exec] result: exitCode=${result.exitCode} stdout=${result.stdout.length}chars stderr=${result.stderr.length}chars`,
    );
    if (result.exitCode !== 0 || result.stderr) {
      console.log(`[exec] stdout: ${result.stdout.substring(0, 500)}`);
      console.log(`[exec] stderr: ${result.stderr.substring(0, 500)}`);
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[exec] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
