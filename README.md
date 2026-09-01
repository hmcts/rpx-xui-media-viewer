# @hmcts/media-viewer 
[![Node.js Package](https://github.com/hmcts/rpx-xui-media-viewer/actions/workflows/npmpublish.yml/badge.svg)](https://github.com/hmcts/rpx-xui-media-viewer/actions/workflows/npmpublish.yml)

This is an angular library that can be used to view and annotate PDF documents and images

## Running the demo app locally
For the static local demo:

```
yarn package
yarn start:ng
```

For the AAT-connected standalone app, use the runbook below.

## Running locally against AAT
The standalone demo can run on your machine while its bundled Express API proxies Media Viewer calls to AAT. This is the local replacement path for the old `em-showcase` media-viewer checks.

Local URLs:
- Angular app: `http://localhost:3000/`
- Media Viewer route: `http://localhost:3000/#/media-viewer`
- Retired DM Store compatibility route: `http://localhost:3000/#/dm-store`
- Local API health: `http://localhost:1337/health`

The local browser talks to Angular on port `3000`. Angular uses `proxy.config.js` to send `/documents`, `/em-anno`, `/api`, `/icp`, `/hearing-recordings`, and `/doc-assembly` to the local API on port `1337`. The local API then connects to AAT services.

### Prerequisites
- Azure CLI installed.
- Logged in to the HMCTS Azure tenant with access to `rpx-aat` Key Vault.
- Yarn dependencies installed for this repo.
- Network access to AAT internal service URLs.

Check Azure access:

```
az account show
az keyvault secret show --vault-name rpx-aat --name show-oauth2-token --query id -o tsv
```

### 1. Generate the local `.env`
Generate `.env` from `.env.example` and `rpx-aat` Key Vault:

```
yarn env:populate:aat
```

The generated `.env` is ignored by git and must not be committed.

The script populates:
- `IDAM_SECRET` from `show-oauth2-token`
- `IDAM_PASSWORD` from `password`
- `S2S_KEY` from `microservicekey-em-gw`

To write to a different file:

```
bash ./scripts/populate-env-from-keyvault.sh aat /tmp/media-viewer.env .env.example
```

### 2. Validate the AAT config
Run this before starting the app if you only want to prove the endpoint wiring:

```
yarn check:aat-config
```

This compiles the local API and checks the resolved AAT targets for document assembly, DM Store, HRS, annotations, NPA, ICP, IdAM, and S2S.

### 3. Start Media Viewer against AAT
Start both the local API and Angular app:

```
yarn start:aat
```

This command:
- loads `.env`
- sets `MV_USE_AAT=true`
- builds the Media Viewer library assets needed by the demo
- compiles the local API into `dist/api`
- starts the local API on `PORT` or `1337`
- starts Angular with `proxy.config.js`

When Angular is already running and only the local API needs restarting, use:

```
yarn start:api:aat
```

Do not use `yarn start:api` directly for an AAT-backed run. It deliberately has no
environment bootstrap and will otherwise target the non-AAT local proxy defaults.

Open:

```
http://localhost:3000/#/media-viewer
```

### 4. Smoke test a running local instance
In another terminal, run:

```
yarn smoke:local:aat
```

The smoke check verifies:
- `http://localhost:3000/`
- `http://localhost:1337/health` returns `UP`

Use a browser for route-level checks because `#/media-viewer` and `#/dm-store` are Angular hash routes, not server paths.

For browser-level proof that the standalone viewer is using AAT-backed services, keep
`yarn start:aat` running, then run:

```
yarn test:local:aat
```

This executes the Functional Playwright contracts against the local standalone Media
Viewer and AAT-backed proxy configuration while keeping the browser at
`http://localhost:3000/`. It does not create CCD cases or DM Store documents; use
the opt-in external-service contracts for those live service probes. The lightweight
route and health check remains available as `yarn smoke:local:aat`.

### Test a local `em-icp-api` change

The standalone app reaches ICP through its local API. Keep the other services on AAT,
but override only `ICP_API_URL` in the ignored `.env` file:

```
ICP_API_URL=http://localhost:8080
```

Create an isolated worktree for the ICP branch under test. The example below uses
PR #1546 and leaves the normal ICP checkout untouched:

```
cd ../em-icp-api
git fetch origin pull/1546/head
git worktree add --detach /private/tmp/em-icp-pr1546-validation FETCH_HEAD
cd /private/tmp/em-icp-pr1546-validation
yarn install --immutable
docker compose -f docker-compose.yml up -d redis
```

Its `config/local-dev.yaml` is ignored by `em-icp-api`; create it and configure the
AAT IdAM URL, local Redis and AAT Web PubSub client URL:

```yaml
idam:
  url: https://idam-api.aat.platform.hmcts.net
redis:
  host: localhost
  port: 6379
  useTLS: "false"
icp:
  wsUrl: wss://em-icp-webpubsub.aat.platform.hmcts.net/client/hubs/localhub
```

Check that the active Azure identity can read the approved secret without printing its
value:

```
az keyvault secret show \
  --vault-name em-icp-aat \
  --name em-icp-web-pubsub-primary-connection-string \
  --query id -o tsv
```

Immediately before starting ICP, load the connection string into `NODE_CONFIG` only for
that process. This command does not echo or write the secret to disk:

```
local_webpubsub_secret="$(az keyvault secret show \
  --vault-name em-icp-aat \
  --name em-icp-web-pubsub-primary-connection-string \
  --query value -o tsv)"
export NODE_CONFIG="$(LOCAL_WEBPUBSUB_SECRET="$local_webpubsub_secret" node -e 'console.log(JSON.stringify({secrets: {"em-icp": {"em-icp-web-pubsub-primary-connection-string": process.env.LOCAL_WEBPUBSUB_SECRET}}}))')"
unset local_webpubsub_secret
```

For Web PubSub callback testing, make the following local-only edits in the ICP
checkout before starting it. The API currently hard-codes the deployed `Hub`/`hub`
names in three places, whereas the tunnel uses `localhub`; do not commit these edits
with the change being tested:

```
app.ts: new WebPubSubServiceClient(primaryConnectionstring, "localhub")
app.ts: new WebPubSubEventHandler("localhub", ...)
api/routes/sessions.ts: new WebPubSubServiceClient(primaryConnectionstring, "localhub")
```

Then start ICP and check its health:

```
yarn start:local
curl -fsS http://localhost:8080/health
yarn test:unit
```

Then tunnel the AAT Web PubSub hub to the local ICP process in another terminal. Use
the AAT Web PubSub endpoint and keep the upstream HTTP URL local:

```
npx --yes --package @azure/web-pubsub-tunnel-tool awps-tunnel run \
  --hub localhub \
  --endpoint https://em-icp-webpubsub-aat.webpubsub.azure.com \
  --upstream http://localhost:8080 \
  -s 1c4f0704-a29e-403d-b719-b90c34ef14c9 \
  -g em-icp-aat
```

The tunnel needs an authenticated Azure identity that can read the AAT hub settings.
If it reports `403` after resolving the subscription and resource group, obtain the
required AAT Web PubSub access policy or RBAC permission; that is an Azure access
blocker, not a local ICP or Media Viewer failure.

Then start Media Viewer from its repository. Populate the ignored AAT `.env` if it
does not already contain the approved AAT settings, then set the ICP override:

```
cd ../rpx-xui-media-viewer
yarn env:populate:aat
# In .env set:
# ICP_API_URL=http://localhost:8080
yarn start:aat
```

Open `http://localhost:3000/#/media-viewer`, then run the browser regression lane:

```
PLAYWRIGHT_REPORTERS=list yarn test:local:aat
```

This setup tests local ICP code with AAT authentication and Web PubSub; it does not
recreate the complete retired `em-showcase` Docker stack. The validation run recorded
19 passing ICP unit tests and 71 passing Media Viewer tests.

Current ICP source warning: `api/routes/sessions.ts` logs the primary Web PubSub
connection string. Do not make an authenticated `/icp/sessions/...` request with a
real secret until that log statement is removed; this is a source-security blocker,
not a Media Viewer setup failure.

Stop the local processes with `Ctrl+C`, then clean up Redis from the ICP worktree with
`docker compose -f docker-compose.yml down`.

### 5. Run Playwright tests
Media Viewer is starting its Playwright migration with the same runner and
reporting shape used in MC and MO, scaled to the current smoke coverage. The
legacy Protractor and CodeceptJS functional packs still exist; new browser
coverage should be added under `playwright_tests/`.

Current Playwright lanes:

| Lane | Config/project | Command | Scope |
| --- | --- | --- | --- |
| Standalone smoke | `playwright.config.ts`, project `smoke` | `yarn test:playwright:smoke` or `yarn test:smoke` | One readiness contract: loads a standalone PDF and proves the rendered viewer, first page and canvas are usable. |
| Migrated functional | `playwright.config.ts`, project `functional` | `yarn test:playwright:functional` | 74 fixture-backed browser contracts across 13 feature files, including separate failed PDF/image rendered-state diagnostics. Two additional image-annotation create contracts are discoverable, ticketed against [EXUI-5124](https://tools.hmcts.net/jira/browse/EXUI-5124), and excluded from the default selection because the current product does not persist an image draw-box annotation. See [`playwright_tests/functional/README.md`](playwright_tests/functional/README.md). |
| External service diagnostics | `playwright.config.ts`, opt-in project `external-service-contracts` | `yarn test:playwright:external-service-contracts` | Optional live AAT CCD/DM Store/annotation probes for a deliberate environment investigation. The default command executes 6 non-defect service contracts; four CCD browser-route contracts tagged against [EXUI-5122](https://tools.hmcts.net/jira/browse/EXUI-5122) and [EXUI-5123](https://tools.hmcts.net/jira/browse/EXUI-5123) remain discoverable but are excluded by default. Use `PLAYWRIGHT_INCLUDE_KNOWN_DEFECTS=true` to discover and execute all 10. They are never part of normal PR assurance. |
| Cross-browser smoke | `playwright.config.ts`, projects `smoke-firefox` and `smoke-webkit` | `yarn test:crossbrowser` | Runs the same readiness contract in Firefox and WebKit and publishes separate JUnit/Odhín output under `functional-output/tests/playwright-crossbrowser`. |
| Viewer support | `playwright.config.ts`, project `support` | `yarn test:playwright:support` | Proves the reusable PDF, image and unsupported-media fixtures, component objects and response diagnostics. |

The current migration slice is deliberately separated from smoke: smoke proves
the application is ready, functional proves user-facing viewer behaviour and
its deterministic Viewer/service request-response contracts, and support proves
the reusable automation contracts. External service diagnostics
are opt-in and never gate a standalone Media Viewer change. Every Playwright Odhín report includes a capability
inventory that states whether each contract is selected by default or is a
discoverable, ticketed product-defect contract.

The Playwright config runs tests fully in parallel with seven workers by
default. Set `FUNCTIONAL_TESTS_WORKERS` to a positive integer (up to 64) for an
intentional capacity run. Each test gets its own browser context and page-scoped
route mocks. Tests must not depend on execution order or share mutable
documents; mutation-heavy AAT journeys must provision a document per test or
reset it before reuse.

Install the Playwright browsers once before local runs when the browser cache is empty:

```
yarn test:setup:playwright-install-browsers
```

Run the smoke project against a running standalone demo app. Start the app in
one terminal:

```
yarn start
```

Then run the smoke in another terminal:

```
yarn test:playwright:smoke
# unified Playwright accessibility pack (Axe, WAVE-like, screen-reader-like)
yarn test:a11y
# Firefox and WebKit smoke gate
yarn test:crossbrowser
```

Override the smoke document and case id with `MV_SMOKE_PDF_DOCUMENT_URL` and
`MV_SMOKE_CASE_ID`. `yarn test:smoke` and `yarn test:local:aat` run the
Playwright smoke, so the standalone and local-AAT PDF loading journeys no longer
fall back to CodeceptJS.

The lane wrapper commands write Playwright evidence under `functional-output/tests`:

| Lane | Odhín | JUnit | Trace and screenshot output |
| --- | --- | --- | --- |
| Viewer support | `functional-output/tests/playwright-support/odhin-report/xui-playwright-support.html` | `functional-output/tests/playwright-support/playwright-support-junit.xml` | `functional-output/tests/playwright-support/test-results` |
| Smoke | `functional-output/tests/playwright-smoke/odhin-report/xui-playwright-smoke.html` | `functional-output/tests/playwright-smoke/playwright-smoke-junit.xml` | `functional-output/tests/playwright-smoke/test-results` |
| Migrated functional | `functional-output/tests/playwright-functional/odhin-report/xui-playwright-functional.html` | `functional-output/tests/playwright-functional/playwright-functional-junit.xml` | `functional-output/tests/playwright-functional/test-results` |
| Accessibility | `functional-output/tests/playwright-accessibility/odhin-report/xui-playwright-accessibility.html` | `functional-output/tests/playwright-accessibility/playwright-accessibility-junit.xml` | `functional-output/tests/playwright-accessibility/test-results` |
| Cross-browser smoke | `functional-output/tests/playwright-crossbrowser/odhin-report/xui-playwright-crossbrowser.html` | `functional-output/tests/playwright-crossbrowser/playwright-crossbrowser-junit.xml` | `functional-output/tests/playwright-crossbrowser/test-results` |

Those are the default lane-specific paths. CNP keeps preview and AAT viewer
support evidence separate under `functional-output/tests/playwright-support/preview`
and `functional-output/tests/playwright-support/aat`. Smoke evidence remains under
`functional-output/tests/playwright-smoke/preview` and
`functional-output/tests/playwright-smoke/aat`.

The raw aggregate `npx playwright test --config=playwright.config.ts` command
uses `functional-output/tests/playwright` unless the report paths are overridden.

Reporting behavior follows the MC/MO pattern:

- Odhín is produced through the patched `odhin-reports-playwright` reporter.
- Each successfully generated Odhín report uses a stable suite title and includes the application
  version, branch, target environment, CI or local context, worker count, CPU
  count and total RAM in its run information.
- CI logs Odhín finalisation progress using the same progress reporter as MC/MO.
- Odhín is the only standard human-readable report. JUnit is retained for
  Jenkins ingestion. Screenshots and traces are kept for failed and timed-out
  attempts; videos are disabled.
  The standard Playwright HTML reporter is not supported.
- `PLAYWRIGHT_SKIP_INSTALL=true` skips browser installation when Jenkins or a
  local setup step has already installed Chromium.
- Jenkins CNP and nightly pipelines publish the Odhín HTML reports, publish
  JUnit XML, and archive the full Playwright output folders.
- The classic Jenkins build page exposes viewer-support reports as `PREVIEW
  Playwright Viewer Support Test`, `AAT Playwright Viewer Support Test`, or
  `Nightly Playwright Viewer Support Test`. Blue Ocean does not reliably show
  HTML Publisher links.

The Jenkins `YarnBuilder` performs its immutable dependency install before the
first setup task. The pipeline then installs Puppeteer Chrome once for legacy
tests and Chromium into the workspace-local `PLAYWRIGHT_BROWSERS_PATH`, and sets
`PLAYWRIGHT_SKIP_INSTALL=true` so Playwright lanes do not reinstall it.

Useful overrides:
- `PLAYWRIGHT_BASE_URL` or `TEST_URL`: target application URL, default `http://localhost:3000/`
- `PLAYWRIGHT_REPORTERS`: comma-separated reporter list, for example `list,junit,odhin`
- `PLAYWRIGHT_DEFAULT_REPORTER`: terminal reporter when `PLAYWRIGHT_REPORTERS` is not set, default `list` locally and `dot` in CI
- `PLAYWRIGHT_JUNIT_OUTPUT`: JUnit XML path
- `PLAYWRIGHT_REPORT_FOLDER`: Odhín report folder
- `PLAYWRIGHT_REPORT_INDEX_FILENAME`: Odhín report file name
- `PLAYWRIGHT_REPORT_TITLE`: Odhín report title
- `PLAYWRIGHT_REPORT_PROJECT`: Odhín project label
- `PLAYWRIGHT_REPORT_RELEASE`: Odhín release label, default `<version> | branch=<branch>`
- `PLAYWRIGHT_REPORT_BRANCH`: branch override used by the default release label
- `PLAYWRIGHT_REPORT_TEST_ENVIRONMENT` or `PW_ODHIN_ENV`: complete Odhín test-environment label override
- `TEST_TYPE`: target-environment label, otherwise inferred from the test URL
- `PLAYWRIGHT_TEST_OUTPUT_DIR`: traces and screenshots folder
- `FUNCTIONAL_TESTS_WORKERS`: worker-count override from `1` to `64`, default `7`
- `PLAYWRIGHT_SKIP_INSTALL=true`: skip the automatic Chromium install in Playwright scripts

Use this local proof set before pushing Playwright documentation or pipeline
changes:

```
yarn install --immutable
yarn test:setup:playwright-install-chromium
PLAYWRIGHT_SKIP_INSTALL=true yarn test:playwright:smoke:list
PLAYWRIGHT_SKIP_INSTALL=true npx playwright test --config=playwright.config.ts
```

For a smoke behavior proof, start the app in one terminal:

```
yarn start
```

Then run the Playwright smoke in another terminal:

```
PLAYWRIGHT_SKIP_INSTALL=true yarn test:smoke
```

Migration boundaries:

- Put new native Playwright specs under `playwright_tests/`.
- Keep screen interactions and reusable locators in page objects under
  `playwright_tests/pages/`; keep assertions visible in specs.
- Historical CodeceptJS scenarios are retained as source traceability only;
  their executable pipeline routing is retired once the mapped Playwright
  contract is selected by default or is represented by a discoverable,
  ticketed product-defect contract.
- Add stable report output paths for every new Playwright lane so Jenkins can
  publish Odhín and JUnit and archive failure diagnostics without bespoke stage
  logic.
- Prefer Playwright browser-level assertions for viewer readiness; do not treat
  an error page, blank page, wrong route or service-down page as a valid ready
  signal.

### 6. Run local Playwright lanes
`yarn test:local:aat` is the standalone smoke lane; it does not create a CCD
case or DM Store document. Run the fixture-backed Functional lane locally with:

```
yarn test:playwright:functional
```

The default local suite is standalone: it needs neither AAT credentials nor
shared CCD, DM Store or annotation-service state. External service diagnostics
are deliberately opt-in and must not be used as normal migration assurance. The
external command runs 6 contracts by default; `PLAYWRIGHT_INCLUDE_KNOWN_DEFECTS=true`
runs the full 10-contract inventory, including the four ticketed CCD browser defects.
Known product-defect contracts are not skipped: they remain discoverable and
run only when explicitly selected:

```
PLAYWRIGHT_INCLUDE_KNOWN_DEFECTS=true yarn test:playwright:functional -- --grep @defect-EXUI-5124
```

### Useful overrides
Most developers should use the defaults from `.env.example`. Override only when you are deliberately testing a different endpoint or registered client setting.

Common overrides:
- `PORT`: local API port, default `1337`
- `DOCASSEMBLY_URL`
- `DM_STORE_APP_URL`
- `HRS_API_URL`
- `ANNOTATION_API_URL`
- `NPA_URL`
- `ICP_API_URL`
- `IDAM_URL`
- `REDIRECT_URL`
- `S2S_URL`

The default `REDIRECT_URL` uses the registered AAT `xui-media-viewer` callback. Do not change it to a localhost callback unless the IdAM client registration supports that callback.

### Troubleshooting
- Missing `IDAM_SECRET`, `IDAM_PASSWORD`, or `S2S_KEY`: run `yarn env:populate:aat` again and confirm Azure access to `rpx-aat`.
- IdAM token errors: confirm `IDAM_URL=https://idam-api.aat.platform.hmcts.net`.
- Blank viewer or missing toolbar assets: restart with `yarn start:aat`; it runs `build:lib`, `copy:lib-js-dependencies`, and `copy:lib-assets` before serving.
- Port conflict on `1337`: set `PORT` in `.env` and restart.
- Service connectivity failures: check VPN/network access to AAT internal service URLs.

## Replacing em-showcase media-viewer use
This standalone app replaces `em-showcase` for Media Viewer validation against AAT. It keeps compatible local navigation for `/`, `#/media-viewer`, and `#/dm-store`.

The `#/dm-store` route is intentionally a retired compatibility route. It points users back to the Media Viewer document ID flow instead of carrying the old DM Store showcase UI.

Supported Media Viewer checks include document loading, annotations, redactions, redaction search, ICP, multimedia, hearing-recording, and document-assembly proxy paths.

## Integrating into your own Angular application
add @hmcts/media-viewer as a dependency in package.json

```
npm install --save @hmcts/media-viewer
```

import MediaViewerModule and declare it in your NgModule imports together with NGRX store if you don't have it already .

```
import { MediaViewerModule } from 'media-viewer';

@NgModule({
  imports: [
    ...,
    MediaViewerModule,
    StoreModule.forRoot({}, {}),
    EffectsModule.forRoot([]),
  ]
})
```

import assets to your angular.json

```
{
    "glob": "**/*",
    "input": "node_modules/@hmcts/media-viewer/assets",
    "output": "/assets"
}
```

component entry point:

```
<mv-media-viewer [url]="'assets/example.pdf'"
                 [downloadFileName]="'example.pdf'"
                 [showToolbar]="true"
                 [contentType]="'pdf'">
</mv-media-viewer>  
```
### Media Viewer Styles
Add these styles to your component.scss if you need them.
If you're writing your own toolbar styles then do not import those

```
// Import GOV.UK Frontend
@import "~govuk-frontend/govuk/all";
// Import Media Viewer Styles
@import "~media-viewer/src/assets/all"; // use this to import all the styles 
```
Alternatively, it is possible to import file by file as required from ```assets/sass``` directory 

eg. ```~media-viewer/assets/sass/toolbar/main```

## Customisations
### Toolbar
The toolbar may be toggled off by setting `showToolbar` to false. The toolbar itself is available as a module that can be included into the DOM at a different location if necessary. 

### Toolbar buttons
Toolbar buttons can be toggled on or off using the 'toolbarButtonOverrides' input.
Each button can toggled on or off as follows:
```
toolbarButtons = { showRotate: true, showDownload: false }

<mv-media-viewer ...
                 [toolbarButtonOverrides]="toolbarButtons">
</mv-media-viewer>  
```
The full list of buttons is as follows:
```
showPrint
showDownload
showNavigation
showZoom
showRotate
showHighlightButton
showDrawButton
showSearchBar
showSidebar
```       

### Media Viewer Height and Width
You can set height and width of the media viewer otherwise it will be set to default settings of 100%.

```
<mv-media-viewer ...
                 [height]="'500px'"
                 [width]="'500px'">
</mv-media-viewer>  
```

### Annotation API
To override the default Annotation API path (or URL for cross domain calls) use "annotationApiUrl" parameter
```
<mv-media-viewer annotationApiUrl=""http://my-gateway.com/my-context-path""  ... >
</mv-media-viewer>
```

## Backend setup
- the media-viewer expects calls to the backend to be proxied by the consuming application. This includes the following APIs:
  - '/documents', endpoint to be proxied to the 'document-store'
  - '/em-anno', endpoint to be proxied to the 'annotations-api', if annotations are turned on
  - '/api/markups', endpoint to be proxied to the 'em-native-pdf-annotator-app', if redaction is turned on
  - '/api/redaction', endpoint to be proxied to the 'em-native-pdf-annotator-app', if redaction is turned on

### Proxying backend Api calls
In order to use annotations/redactions on the media viewer, you need to proxy backend calls.

Example:
```
import * as proxy from "http-proxy-middleware";
```
Annotation Config:
```
const annotation = {
    endpoints: ["/em-anno"],
    target: "Enter URL",
    pathRewrite: {
        "^/em-anno": "/api"
    }
}
```
How to use the proxy:
```
this.app.use(proxy(annotation.endpoints, { target: annotation.target }));
```

## Viewer Exceptions
The Media Viewer will return load status and provide exceptions if thrown for the host application to consume.
It is up to the consuming application whether or not to notify the user of those exceptions, as the Media-Viewer will not  
```
    <mv-media-viewer [url]="'assets/example.pdf'"
                     [downloadFileName]="'example.pdf'"
                     [showToolbar]="true"
                     [contentType]="'pdf'"
                     [enableAnnotations]="true"
                     [enableRedactions]="true"
                     (mediaLoadStatus)="onMediaLoadStatus($event)"
                     (viewerException)="onMediaLoadException($event)">
    </mv-media-viewer>  
```

When exceptions are thrown by the different Media Viewers, the exception is encapsulated in an object called `ViewerException` and passed up the chain to be used by consuming service.

The structure of the `ViewerException` exception class can be seen below:

    exceptionType: error.name,
    detail: {
      httpResponseCode: error.status,
      message: error.message
    }
    
The list of exceptions thrown by the Media Viewer are as follows:
- UnknownErrorException
- MissingPdfException
- InvalidPDFException
- UnexpectedResponseException
- HttpErrorResponse
- PasswordException

## Cucumber Tests
 ```
  npm run package, npm run e2e:cucumber
  ```
