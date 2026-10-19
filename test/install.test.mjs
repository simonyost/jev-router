import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { FORMER_PACKAGE, globalCommand, installedCommand, installSpec, npxDirOf, origin, PACKAGE } from '../src/install.mjs';

const FORK = 'github:simonyost/jev-router#main';

test('installation fallbacks point to the fork and never resolve an npm registry package', () => {
  const temp = mkdtempSync(join(tmpdir(), 'jev-install-'));
  try {
    assert.equal(PACKAGE, '@simonyost/jev-router');
    assert.equal(FORMER_PACKAGE, '@ediri/jev-router');
    assert.deepEqual(origin('1.6.0', join(temp, 'bin', 'jev-router.mjs')), { spec: FORK });
    assert.deepEqual(installSpec(undefined, temp, '1.6.0'), { spec: FORK, registry: false });
    assert.deepEqual(installSpec('latest', temp, '1.6.0'), { spec: FORK, registry: false });
    assert.deepEqual(installSpec('@ediri/jev-router@1.6.0', temp, '1.6.0'), { spec: FORK, registry: false });
    for (const upstream of [
      'git+ssh://git@github.com:dirien/jev-router.git#main',
      'https://github.com/dirien/jev-router/archive/refs/heads/main.tar.gz',
    ])
      assert.deepEqual(installSpec(upstream, temp, '1.6.0'), { spec: FORK, registry: false });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('npx origin keeps local installs, accepts fork git specs, and replaces upstream git specs', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-npx-origin-'));
  try {
    const npx = join(root, 'cache', '_npx', 'abc123');
    const bin = join(npx, 'node_modules', '@simonyost', 'jev-router', 'bin');
    mkdirSync(bin, { recursive: true });
    const script = join(bin, 'jev-router.mjs');
    writeFileSync(script, '');
    writeFileSync(join(npx, 'package.json'), JSON.stringify({ dependencies: { [PACKAGE]: 'github:dirien/jev-router#main' } }));
    assert.deepEqual(origin('1.6.0', script), {
      npx: npxDirOf(script),
      spec: FORK,
      npxCommand: `npx '${FORK}'`,
    });

    writeFileSync(join(npx, 'package.json'), JSON.stringify({ dependencies: { [PACKAGE]: 'github:simonyost/jev-router#feature' } }));
    assert.deepEqual(origin('1.6.0', script), {
      npx: npxDirOf(script),
      spec: 'github:simonyost/jev-router#feature',
      npxCommand: "npx 'github:simonyost/jev-router#feature'",
    });

    assert.deepEqual(installSpec('file:../../../build/router.tgz', npx, '1.6.0'), {
      spec: join(root, 'build', 'router.tgz'),
      registry: false,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an upstream package with the same version is not reused as the fork installation', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-upstream-command-'));
  try {
    const bin = join(root, 'node_modules', '@ediri', 'jev-router', 'bin');
    mkdirSync(bin, { recursive: true });
    const command = join(bin, 'jev-router');
    writeFileSync(command, '#!/bin/sh\n');
    chmodSync(command, 0o755);
    assert.equal(installedCommand({ PATH: bin }), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('npm prefix fallback also rejects an upstream package command', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-upstream-prefix-'));
  try {
    const command = join(root, 'upstream', 'node_modules', '@ediri', 'jev-router', 'bin', 'jev-router');
    mkdirSync(join(command, '..'), { recursive: true });
    writeFileSync(command, '#!/bin/sh\n');
    chmodSync(command, 0o755);
    const prefix = join(root, 'global');
    mkdirSync(join(prefix, 'bin'), { recursive: true });
    symlinkSync(command, join(prefix, 'bin', 'jev-router'));
    const npmDir = join(root, 'npm-bin');
    mkdirSync(npmDir);
    const npm = join(npmDir, 'npm');
    writeFileSync(npm, `#!/bin/sh\nprintf '%s\\n' '${prefix}'\n`);
    chmodSync(npm, 0o755);
    assert.equal(globalCommand({ PATH: npmDir }), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a local fork checkout installs the exact checked out source', () => {
  const root = mkdtempSync(join(tmpdir(), 'jev-fork-checkout-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'bin'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: PACKAGE }));
    writeFileSync(join(root, 'bin', 'jev-router.mjs'), '');
    assert.deepEqual(origin('1.6.0', join(root, 'bin', 'jev-router.mjs')), { spec: root });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
