import { spawn } from 'node:child_process';

/** Version de Spec Kit (specify-cli) épinglée par l'installeur. */
export const SPECIFY_VERSION = '1.3.2';

export type Run = (
  cmd: string,
  args: string[],
  opts: { cwd: string; input?: string },
) => Promise<{ code: number; stdout: string; stderr: string }>;

/** Lance une commande sans shell. Ne rejette que si le processus ne peut pas démarrer. */
export const run: Run = (cmd, args, opts) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => (stdout += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    // Un EPIPE sur stdin (processus déjà terminé) ne doit pas faire tomber l'installeur.
    child.stdin.on('error', () => {});
    if (opts.input !== undefined) child.stdin.write(opts.input);
    child.stdin.end();
  });

export class SpecifyError extends Error {
  code: number;
  stderr: string;
  constructor(code: number, stderr: string) {
    super(`specify a échoué (code ${code}) : ${stderr.trim()}`);
    this.name = 'SpecifyError';
    this.code = code;
    this.stderr = stderr;
  }
}

/** Exécute `specify …args` via uvx, à la version épinglée ; renvoie stdout. */
export async function specify(runner: Run, cwd: string, args: string[]): Promise<string> {
  const { code, stdout, stderr } = await runner(
    'uvx',
    ['--from', `specify-cli==${SPECIFY_VERSION}`, 'specify', ...args],
    { cwd },
  );
  if (code !== 0) throw new SpecifyError(code, stderr);
  return stdout;
}

export async function hasUv(runner: Run): Promise<boolean> {
  try {
    return (await runner('uvx', ['--version'], { cwd: process.cwd() })).code === 0;
  } catch {
    return false;
  }
}
