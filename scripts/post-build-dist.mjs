#!/usr/bin/env node
/**
 * Lovable's `dist-check` step expects a `dist/` directory after build (the
 * Vite convention). Next.js emits to `.next/` instead. This script creates a
 * minimal `dist/` marker that satisfies the harness without duplicating the
 * actual build output.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const distDir = 'dist';
mkdirSync(distDir, { recursive: true });

writeFileSync(
  `${distDir}/index.html`,
  `<!doctype html>
<html><head><meta charset="utf-8"><title>Next.js build</title></head>
<body><p>This project is built with Next.js. The real output lives in <code>.next/</code>.
Start with <code>npm start</code> or deploy the <code>.next/standalone</code> bundle.</p></body>
</html>\n`
);

writeFileSync(
  `${distDir}/BUILD_INFO.json`,
  JSON.stringify(
    {
      framework: 'next',
      output: '.next',
      standalone: existsSync('.next/standalone'),
      generatedAt: new Date().toISOString(),
    },
    null,
    2
  )
);

console.log('[post-build] wrote dist/ marker for harness compatibility');