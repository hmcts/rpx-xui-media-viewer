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

This opens `http://localhost:3000/#/media-viewer`, loads
`/documents/<MV_SMOKE_PDF_DOCUMENT_ID>/binary`, and waits for the rendered PDF viewer
and first page. If `MV_SMOKE_PDF_DOCUMENT_ID` is blank, the smoke uses the demo app's
default AAT PDF document id.

### 5. Run Playwright tests
Media Viewer is starting its Playwright migration with the same runner and
reporting shape used in MC and MO, scaled to the current smoke coverage. The
legacy Protractor and CodeceptJS functional packs still exist; new browser
coverage should be added under `playwright_tests/`.

Current Playwright lanes:

| Lane | Config/project | Command | Scope |
| --- | --- | --- | --- |
| Standalone smoke | `playwright.config.ts`, project `smoke` | `yarn test:playwright:smoke` or `yarn test:smoke` | Opens the standalone Media Viewer demo, loads `assets/example.pdf`, and verifies the PDF viewer, page-number control and first rendered page. |
| Viewer support | `playwright.config.ts`, project `support` | `yarn test:playwright:support` | Proves the reusable PDF, image and unsupported-media fixtures, component objects and response diagnostics. |

The Playwright config runs tests fully in parallel with seven workers. Each test
gets its own browser context and page-scoped route mocks. Tests must not depend
on execution order or share mutable documents; mutation-heavy AAT journeys must
provision a document per test or reset it before reuse.

Install Chromium once before local runs when the browser cache is empty:

```
yarn test:setup:playwright-install-chromium
```

Run the smoke project against a running standalone demo app. Start the app in
one terminal:

```
yarn start
```

Then run the smoke in another terminal:

```
yarn test:playwright:smoke
```

Override the smoke document and case id with `MV_SMOKE_PDF_DOCUMENT_URL` and
`MV_SMOKE_CASE_ID`. `yarn test:smoke` now runs the Playwright smoke so Jenkins
CNP uses the same smoke entrypoint style as MC/MO. The previous CodeceptJS smoke
remains available as `yarn test:smoke:legacy` while migration work continues.

The lane wrapper commands write Playwright evidence under `functional-output/tests`:

| Lane | Odhín | HTML | JUnit | Trace, screenshot and video output |
| --- | --- | --- | --- | --- |
| Viewer support | `functional-output/tests/playwright-support/odhin-report/xui-playwright-support.html` | `functional-output/tests/playwright-support/html-report/index.html` | `functional-output/tests/playwright-support/playwright-support-junit.xml` | `functional-output/tests/playwright-support/test-results` |
| Smoke | `functional-output/tests/playwright-smoke/odhin-report/xui-playwright-smoke.html` | `functional-output/tests/playwright-smoke/html-report/index.html` | `functional-output/tests/playwright-smoke/playwright-smoke-junit.xml` | `functional-output/tests/playwright-smoke/test-results` |

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
- HTML, JUnit and Odhín reporters can run together.
- Traces, screenshots and videos are kept on failure for diagnostics.
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
- `PLAYWRIGHT_REPORTERS`: comma-separated reporter list, for example `list,html,junit,odhin`
- `PLAYWRIGHT_DEFAULT_REPORTER`: terminal reporter when `PLAYWRIGHT_REPORTERS` is not set, default `list` locally and `dot` in CI
- `PLAYWRIGHT_HTML_REPORT`: HTML report folder
- `PLAYWRIGHT_JUNIT_OUTPUT`: JUnit XML path
- `PLAYWRIGHT_REPORT_FOLDER`: Odhín report folder
- `PLAYWRIGHT_REPORT_INDEX_FILENAME`: Odhín report file name
- `PLAYWRIGHT_REPORT_TITLE`: Odhín report title
- `PLAYWRIGHT_REPORT_PROJECT`: Odhín project label
- `PLAYWRIGHT_REPORT_RELEASE`: Odhín release label, default `<version> | branch=<branch>`
- `PLAYWRIGHT_REPORT_BRANCH`: branch override used by the default release label
- `PLAYWRIGHT_REPORT_TEST_ENVIRONMENT` or `PW_ODHIN_ENV`: complete Odhín test-environment label override
- `TEST_TYPE`: target-environment label, otherwise inferred from the test URL
- `PLAYWRIGHT_TEST_OUTPUT_DIR`: traces, screenshots and videos folder
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
- Keep legacy Protractor and CodeceptJS coverage until replacement coverage and
  Jenkins evidence are agreed.
- Add stable report output paths for every new Playwright lane so Jenkins can
  publish Odhín, HTML and JUnit without bespoke stage logic.
- Prefer Playwright browser-level assertions for viewer readiness; do not treat
  an error page, blank page, wrong route or service-down page as a valid ready
  signal.

### 6. Create isolated AAT test documents
For mutation-heavy functional tests, do not share one document across parallel tests.
Create fresh AAT DM Store documents through the local API proxy while `yarn start:aat`
is running:

```
yarn local-aat:documents -- --pdf-count 7 --image-count 1 --output .local-aat-documents.env
```

This writes:
- `MV_SMOKE_PDF_DOCUMENT_ID`
- `MV_SMOKE_IMAGE_DOCUMENT_ID`
- `MV_FUNCTIONAL_PDF_DOCUMENT_IDS`
- `MV_FUNCTIONAL_IMAGE_DOCUMENT_IDS`

The upload path mirrors em-showcase: multipart `files`, `classification=PUBLIC`,
and civil/probate metadata are posted to `/documents`.

### 7. Run isolated local functional tests
With `yarn start:aat` still running, execute the functional groups with separate
documents and separate reports:

```
yarn test:functional:local:isolated
```

By default this creates fresh documents, runs up to three feature files at a time,
and writes reports under `functional-output/local-isolated/`. Override with:
- `MV_LOCAL_PARALLEL_MAX_JOBS=1` to run the same isolated groups serially
- `MV_CREATE_LOCAL_AAT_DOCS=false` to reuse IDs from `.local-aat-documents.env`
- `E2E_PARALLEL_OUTPUT_ROOT=<path>` to change report location

Each feature writes its own report directory, including:
- `mv-e2e-result.html`
- `mv-e2e-result.json`
- `result.xml`

The validated local AAT sequence is:

```
yarn check:aat-config
yarn start:aat
yarn smoke:local:aat
yarn test:local:aat
yarn test:functional:local:isolated
```

Expected `test:functional:local:isolated` feature groups:
- `annotationsAndComments`
- `bookMarks`
- `redact`
- `printAndDownload`
- `rotate`
- `search`
- `zoomAndnavigation`
- `imageViewerAnnotationsAndComments`

For the strongest isolation proof, make each scenario upload and use its own document:

```
yarn test:functional:local:self-contained
```

This is slower because it creates a fresh AAT DM Store document for each scenario, but
it is the best local check when diagnosing interference between bookmarks,
annotations, comments, and redactions.

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
