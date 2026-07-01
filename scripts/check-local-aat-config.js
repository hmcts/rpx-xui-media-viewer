process.env.MV_USE_AAT = 'true';

const assert = require('assert');
const { config } = require('../dist/api/config');

assert.strictEqual(config.proxies.assembly.target, 'http://dg-docassembly-aat.service.core-compute-aat.internal');
assert.strictEqual(config.proxies.dmStore.target, 'http://dm-store-aat.service.core-compute-aat.internal');
assert.strictEqual(config.proxies.hrsApi.target, 'http://em-hrs-api-aat.service.core-compute-aat.internal');
assert.strictEqual(config.proxies.annotation.target, 'http://em-anno-aat.service.core-compute-aat.internal');
assert.strictEqual(config.proxies.npa.target, 'http://em-npa-aat.service.core-compute-aat.internal');
assert.strictEqual(config.proxies.icp.target, 'https://em-icp.aat.platform.hmcts.net');
assert.strictEqual(config.idam.url, 'https://idam-api.aat.platform.hmcts.net');
assert.strictEqual(config.idam.redirect, 'https://xui-media-viewer-aat.service.core-compute-aat.internal/oauth2/callback');
assert.strictEqual(config.s2s.url, 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal');

console.log('AAT config resolved for media-viewer API proxy targets.');
