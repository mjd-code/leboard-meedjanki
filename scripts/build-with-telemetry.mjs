#!/usr/bin/env node
/**
 * build-with-telemetry.mjs
 *
 * Wraps `next build` and:
 *   - polls RSS / heap usage of the Next/Turbopack process tree every 2s
 *   - streams stdout/stderr to console AND to .next-telemetry/build.log
 *   - on non-zero exit OR a "WorkerError" / "Call retries were exceeded"
 *     match, writes a focused failure report to .next-telemetry/worker-failure.json
 *
 * Usage: node scripts/build-with-telemetry.mjs [extra next build args...]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const OUT_DIR = '.next-telemetry';
mkdirSync(OUT_DIR, { recursive: true });
const LOG_PATH = join(OUT_DIR, 'build.log');
const FAIL_PATH = join(OUT_DIR, 'worker-failure.json');
const MEM_PATH = join(OUT_DIR, 'memory.ndjson');

const logStream = createWriteStream(LOG_PATH, { flags: 'w' });
const memStream = createWriteStream(MEM_PATH, { flags: 'w' });

const started = Date.now();
const args = process.argv.slice(2);
const NODE_OPTS = process.env.NODE_OPTIONS ?? '--max-old-space-size=4096';

console.log(`[telemetry] starting next build (NODE_OPTIONS="${NODE_OPTS}")`);
console.log(`[telemetry] system: ${os.platform()} ${os.arch()} cpus=${os.cpus().length} totalmem=${(os.totalmem()/1e9).toFixed(2)}GB`);
console.log(`[telemetry] logs -> ${LOG_PATH}`);

const child = spawn('next', ['build', ...args], {
  env: { ...process.env, NODE_OPTIONS: NODE_OPTS, NEXT_TELEMETRY_DEBUG: '1' },
  stdio: ['inherit', 'pipe', 'pipe'],
});

let peakRss = 0;
let lastChunk = '';
const tail = [];
const TAIL_MAX = 200;

function record(chunk, isErr) {
  const text = chunk.toString();
  lastChunk = text;
  process[isErr ? 'stderr' : 'stdout'].write(text);
  logStream.write(text);
  for (const line of text.split('\n')) {
    if (!line) continue;
    tail.push(line);
    if (tail.length > TAIL_MAX) tail.shift();
  }
}
child.stdout.on('data', (c) => record(c, false));
child.stderr.on('data', (c) => record(c, true));

const memTimer = setInterval(() => {
  const mu = process.memoryUsage();
  const sample = {
    t: Date.now() - started,
    rss_mb: +(mu.rss / 1024 / 1024).toFixed(1),
    heapUsed_mb: +(mu.heapUsed / 1024 / 1024).toFixed(1),
    heapTotal_mb: +(mu.heapTotal / 1024 / 1024).toFixed(1),
    external_mb: +(mu.external / 1024 / 1024).toFixed(1),
    freemem_mb: +(os.freemem() / 1024 / 1024).toFixed(1),
    loadavg: os.loadavg(),
  };
  if (sample.rss_mb > peakRss) peakRss = sample.rss_mb;
  memStream.write(JSON.stringify(sample) + '\n');
}, 2000);

child.on('close', (code, signal) => {
  clearInterval(memTimer);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const failed = code !== 0;
  const workerFailure =
    /WorkerError|Call retries were exceeded|JavaScript heap out of memory|FATAL ERROR/i.test(
      tail.join('\n')
    );

  console.log(`\n[telemetry] exit code=${code} signal=${signal ?? 'none'} elapsed=${elapsed}s peakRss=${peakRss}MB`);

  if (failed || workerFailure) {
    const report = {
      exitCode: code,
      signal,
      elapsedSec: +elapsed,
      peakRssMb: peakRss,
      nodeOptions: NODE_OPTS,
      detectedSignals: {
        workerError: /WorkerError/i.test(tail.join('\n')),
        callRetriesExceeded: /Call retries were exceeded/i.test(tail.join('\n')),
        heapOOM: /JavaScript heap out of memory/i.test(tail.join('\n')),
        fatalError: /FATAL ERROR/i.test(tail.join('\n')),
      },
      tail: tail.slice(-120),
      env: {
        NODE_VERSION: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalmemGb: +(os.totalmem() / 1e9).toFixed(2),
      },
      hint: 'If workerError or heapOOM is true: increase NODE_OPTIONS=--max-old-space-size, e.g. 6144 or 8192, then rerun.',
    };
    writeFileSync(FAIL_PATH, JSON.stringify(report, null, 2));
    console.error(`[telemetry] failure report -> ${FAIL_PATH}`);
  }

  logStream.end();
  memStream.end();
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  clearInterval(memTimer);
  writeFileSync(FAIL_PATH, JSON.stringify({ spawnError: String(err) }, null, 2));
  console.error('[telemetry] spawn error:', err);
  process.exit(1);
});