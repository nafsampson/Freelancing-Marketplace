const { URL } = require('node:url');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD for a disposable demo administrator before running API tests.');
}
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
const url = new URL(baseUrl);
const args = [require.resolve('newman/bin/newman.js'), 'run',
    path.resolve(__dirname, '../../PostmanCollectionTests/marketplace-api.postman_collection.json'),
    '--env-var', `baseUrl=${baseUrl}`, '--env-var', `adminEmail=${process.env.ADMIN_EMAIL}`,
    '--env-var', `adminPassword=${process.env.ADMIN_PASSWORD}`];
if (process.env.ALLOW_SELF_SIGNED_LOCALHOST === 'true') {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw new Error('Certificate verification can only be relaxed explicitly for local test servers.');
    }
    args.push('--insecure');
}
const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
