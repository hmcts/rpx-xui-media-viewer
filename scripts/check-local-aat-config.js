process.env.REFORM_ENVIRONMENT = 'aat';
process.env.IDAM_URL = 'https://idam-api.aat.platform.hmcts.net';
process.env.S2S_URL = 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal';
process.env.DOCASSEMBLY_URL = 'http://dg-docassembly-aat.service.core-compute-aat.internal';
process.env.DM_STORE_APP_URL = 'http://dm-store-aat.service.core-compute-aat.internal';
process.env.HRS_API_URL = 'http://em-hrs-api-aat.service.core-compute-aat.internal';
process.env.ANNOTATION_API_URL = 'http://em-anno-aat.service.core-compute-aat.internal';
process.env.NPA_URL = 'http://em-npa-aat.service.core-compute-aat.internal';
process.env.ICP_API_URL = 'https://em-icp.aat.platform.hmcts.net';
process.env.REDIRECT_URL = 'https://xui-media-viewer-aat.service.core-compute-aat.internal/oauth2/callback';
process.env.NODE_CONFIG = JSON.stringify({
  secrets: {
    'em-showcase': {
      'show-oauth2-token': 'test-idam-secret',
      'microservicekey-em-gw': 'test-s2s-key',
      password: 'test-password'
    }
  }
});

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
assert.strictEqual(config.idam.secret, 'test-idam-secret');
assert.strictEqual(config.idam.password, 'test-password');
assert.strictEqual(config.s2s.secret, 'test-s2s-key');

console.log('AAT config resolved for media-viewer API proxy targets.');
