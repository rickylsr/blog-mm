import { execFileSync } from 'node:child_process';

export function GET() {
  let commit = process.env.WORKERS_CI_COMMIT_SHA;
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim();
    } catch {
      commit = 'unknown';
    }
  }
  return Response.json({
    commit: /^[0-9a-f]{40}$/.test(commit) ? commit : 'unknown',
    publisher: process.env.WORKERS_CI === '1' ? 'cloudflare-builds' : 'local',
  });
}
