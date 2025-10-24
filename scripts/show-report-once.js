#!/usr/bin/env node
const { spawn } = require('node:child_process');

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['playwright', 'show-report', '--host', '127.0.0.1', '--port', '0'],
  { stdio: ['ignore', 'pipe', 'inherit'] }
);

let printed = false;
child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  if (!printed && /Serving HTML report at\s+http:\/\//i.test(text)) {
    printed = true;
    // Give it a moment to flush, then exit
    setTimeout(() => {
      try { child.kill('SIGINT'); } catch {}
      // Ensure parent exits cleanly
      process.exit(0);
    }, 250);
  }
});

child.on('exit', (code) => process.exit(code ?? 0));

