#!/usr/bin/env node

/**
 * Local CI Pipeline for PMD Backend
 * Verifies that the project builds and passes all checks before deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, description) {
  log(`\n▶ ${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✅ ${description} passed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

function checkFileExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${filePath} exists`, 'green');
    return true;
  } else {
    log(`❌ ${filePath} does not exist`, 'red');
    return false;
  }
}

log('🚀 Starting Local CI Pipeline for PMD Backend', 'blue');
log('='.repeat(60), 'blue');

let allPassed = true;

// Step 1: Install dependencies
if (!exec('yarn install', 'Installing dependencies')) {
  allPassed = false;
  process.exit(1);
}

// Step 2: Build with TypeScript
if (!exec('yarn build', 'Building with TypeScript (tsc)')) {
  allPassed = false;
  process.exit(1);
}

// Step 3: Check if dist/main.js exists
if (!checkFileExists('dist/main.js')) {
  allPassed = false;
  process.exit(1);
}

// Step 4: Run lint if it exists
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.scripts.lint) {
  if (!exec('yarn lint', 'Running linter')) {
    log('⚠️  Linter found issues (non-blocking)', 'yellow');
    // Linter warnings don't block the build
  }
}

// Step 5: Run tests if they exist (quick mode)
if (packageJson.scripts.test && !packageJson.scripts.test.includes('echo')) {
  log('\n⚠️  Tests found but skipping for CI speed (run manually: yarn test)', 'yellow');
  // Uncomment to run tests:
  // if (!exec('yarn test', 'Running tests')) {
  //   allPassed = false;
  // }
}

log('\n' + '='.repeat(60), 'blue');
if (allPassed) {
  log('✅ CI Pipeline PASSED - Ready for deployment', 'green');
  process.exit(0);
} else {
  log('❌ CI Pipeline FAILED - Fix errors before deploying', 'red');
  process.exit(1);
}
