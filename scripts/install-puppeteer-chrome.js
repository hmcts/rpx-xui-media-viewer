#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer');

const executablePath = puppeteer.executablePath();
const parts = executablePath.split(path.sep);
const chromeDirIndex = parts.lastIndexOf('chrome');

if (chromeDirIndex === -1 || chromeDirIndex + 1 >= parts.length) {
  throw new Error(`Unable to determine Puppeteer Chrome cache folder from ${executablePath}`);
}

const browserRoot = parts.slice(0, chromeDirIndex + 2).join(path.sep) || path.sep;

if (fs.existsSync(browserRoot) && !fs.existsSync(executablePath)) {
  console.log(`Removing incomplete Puppeteer Chrome cache: ${browserRoot}`);
  fs.rmSync(browserRoot, { recursive: true, force: true });
}

if (!fs.existsSync(executablePath)) {
  const yarnBin = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const result = spawnSync(yarnBin, ['puppeteer', 'browsers', 'install', 'chrome'], {
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
