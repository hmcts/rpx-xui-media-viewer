#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer');

const executablePath = path.resolve(process.env.PUPPETEER_EXECUTABLE_PATH_FOR_TEST || puppeteer.executablePath());

function getBrowserRoot(executable) {
  let current = path.dirname(executable);

  while (current !== path.dirname(current)) {
    if (path.basename(path.dirname(current)) === 'chrome') {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error(`Unable to determine Puppeteer Chrome cache folder from ${executable}`);
}

const browserRoot = getBrowserRoot(executablePath);

if (process.env.PUPPETEER_INSTALL_SELF_CHECK === 'true') {
  console.log(browserRoot);
  process.exit(0);
}

if (fs.existsSync(browserRoot) && !fs.existsSync(executablePath)) {
  console.log(`Removing incomplete Puppeteer Chrome cache: ${browserRoot}`);
  fs.rmSync(browserRoot, { recursive: true, force: true });
}

if (!fs.existsSync(executablePath)) {
  const yarnBin = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const installEnv = { ...process.env };
  delete installEnv.PUPPETEER_SKIP_DOWNLOAD;
  delete installEnv.PUPPETEER_SKIP_CHROME_DOWNLOAD;

  const result = spawnSync(yarnBin, ['puppeteer', 'browsers', 'install', 'chrome'], {
    env: installEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync(executablePath)) {
  throw new Error(`Puppeteer Chrome executable is still missing after install: ${executablePath}`);
}

console.log(`Puppeteer Chrome ready: ${executablePath}`);
