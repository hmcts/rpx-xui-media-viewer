import * as aksVaultConfig from 'config';
import * as propertiesVolume from '@hmcts/properties-volume';

type VaultConfig = typeof aksVaultConfig & {
  secrets?: {
    [key: string]: Record<string, string | undefined>;
  };
};

const vaultConfig = aksVaultConfig as VaultConfig;
propertiesVolume.addTo(vaultConfig);

const vaultSecrets = vaultConfig.secrets || {};
const appSecrets = vaultSecrets['rpx'] || {};
const useAatUrls = process.env['MV_USE_AAT'] === 'true' || process.env['REFORM_ENVIRONMENT'] === 'aat';

const envOrDefault = (envName: string, localDefault: string, aatDefault: string = localDefault): string =>
  process.env[envName] || (useAatUrls ? aatDefault : localDefault);

const IDAM_SECRET = appSecrets['show-oauth2-token'];
const S2S_KEY = appSecrets['microservicekey-em-gw'];
const IDAM_PASSWORD = appSecrets['password'];

export const config = {
  proxies: {
    assembly: {
      endpoints: [
        '/api/form-definitions',
        '/api/template-renditions',
        '/doc-assembly'
      ],
      target: envOrDefault(
        'DOCASSEMBLY_URL',
        'http://localhost:4631',
        'http://dg-docassembly-aat.service.core-compute-aat.internal'
      ),
      pathRewrite: {
        '^/doc-assembly': '/api'
      }
    },
    dmStore: {
      endpoints: ['/documents'],
      target: envOrDefault(
        'DM_STORE_APP_URL',
        'http://localhost:4603',
        'http://dm-store-aat.service.core-compute-aat.internal'
      )
    },
    hrsApi: {
      endpoints: ['/hearing-recordings'],
      target: envOrDefault(
        'HRS_API_URL',
        'http://localhost:8080',
        'http://em-hrs-api-aat.service.core-compute-aat.internal'
      )
    },
    annotation: {
      endpoints: ['/em-anno'],
      target: envOrDefault(
        'ANNOTATION_API_URL',
        'http://localhost:4623',
        'http://em-anno-aat.service.core-compute-aat.internal'
      ),
      pathRewrite: {
        '^/em-anno': '/api'
      }
    },
    npa: {
      endpoints: [
        '/api/markups',
        '/api/redaction'
      ],
      target: envOrDefault(
        'NPA_URL',
        'http://localhost:4624',
        'http://em-npa-aat.service.core-compute-aat.internal'
      )
    },
    icp: {
      endpoints: ['/icp'],
      target: envOrDefault(
        'ICP_API_URL',
        'http://localhost:4621',
        'https://em-icp.aat.platform.hmcts.net'
      ),
    }
  },
  idam: {
    url: envOrDefault('IDAM_URL', 'http://localhost:5000', 'http://idam-api.aat.platform.hmcts.net'),
    client: process.env['IDAM_CLIENT_ID'] || 'webshow',
    secret: process.env['IDAM_SECRET'] || process.env['IDAM_CLIENT_SECRET'] || IDAM_SECRET || 'AAAAAAAAAAAAAAAA',
    redirect: process.env['REDIRECT_URL'] || 'https://xui-media-viewer-aat.service.core-compute-aat.internal/oauth2/callback',
    password: process.env['IDAM_PASSWORD'] || IDAM_PASSWORD || '***REMOVED***',
  },
  s2s: {
    url: envOrDefault('S2S_URL', 'http://localhost:4502', 'http://rpe-service-auth-provider-aat.service.core-compute-aat.internal'),
    secret: process.env['S2S_KEY'] || process.env['S2S_SECRET'] || S2S_KEY || 'AAAAAAAAAAAAAAAA',
    microservice: process.env['S2S_MICROSERVICE'] || 'em_gw'
  },
  port: process.env.PORT || 1337,
  tokenRefreshTime: 60 * 60 * 1000
};
