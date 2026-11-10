import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasUv, SpecifyError, specify, type Run } from './specify.mts';

describe('specify', () => {
  it('passes the pinned version to uvx', async () => {
    const calls: { cmd: string; args: string[]; cwd: string }[] = [];
    const fake: Run = async (cmd, args, opts) => {
      calls.push({ cmd, args, cwd: opts.cwd });
      return { code: 0, stdout: 'ok', stderr: '' };
    };
    const out = await specify(fake, '/p', ['preset', 'list']);
    assert.equal(out, 'ok');
    assert.equal(calls[0]?.cmd, 'uvx');
    assert.deepEqual(calls[0]?.args, ['--from', 'specify-cli==1.3.2', 'specify', 'preset', 'list']);
    assert.equal(calls[0]?.cwd, '/p');
  });

  it('rejects with SpecifyError on a non-zero exit', async () => {
    const fake: Run = async () => ({ code: 2, stdout: '', stderr: 'boom' });
    await assert.rejects(specify(fake, '/p', ['x']), (e: unknown) => {
      assert.ok(e instanceof SpecifyError);
      assert.equal(e.code, 2);
      assert.equal(e.stderr, 'boom');
      return true;
    });
  });

  it('hasUv is false when uvx cannot be spawned', async () => {
    const fake: Run = async () => {
      throw Object.assign(new Error('spawn uvx ENOENT'), { code: 'ENOENT' });
    };
    assert.equal(await hasUv(fake), false);
  });

  it('hasUv is true on exit code 0', async () => {
    const fake: Run = async () => ({ code: 0, stdout: 'uv 1', stderr: '' });
    assert.equal(await hasUv(fake), true);
  });
});
