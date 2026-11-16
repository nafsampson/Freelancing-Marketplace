const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backend = path.resolve(__dirname, '..');
const coverage = process.argv.includes('--coverage');
const args = ['--test', '--test-concurrency=1'];

if (coverage) {
    fs.mkdirSync(path.join(backend, 'coverage'), { recursive: true });
    args.push('--experimental-test-coverage', '--test-reporter=spec',
        '--test-reporter-destination=stdout', '--test-reporter=lcov',
        '--test-reporter-destination=coverage/lcov.info');
}

// Explicit paths avoid shell-specific wildcard expansion; integration tests in
// subdirectories remain opt-in. One worker keeps memory use modest.
const tests = fs.readdirSync(path.join(backend, 'tests'))
    .filter(file => file.endsWith('.test.js')).sort();
if (tests.length === 0) throw new Error('No unit test files found.');
args.push(...tests.map(file => path.join('tests', file)));

const result = spawnSync(process.execPath, args, {
    cwd: backend, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
