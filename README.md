MEDIA VIEWER
============

Overview
--------

@hmcts/media-viewer is an Angular library for viewing and annotating PDF
documents, images and other supported media. It includes viewer controls for
navigation, search, zoom, rotation, bookmarks, comments, annotations and
redactions, together with a standalone demo application.

The repository also contains a local Express proxy API, AAT configuration,
Playwright smoke and functional suites, accessibility checks, cross-browser
checks and packaged-library build scripts.

Repository status note

This working tree currently has tracked files marked as deleted. This rewrite
was created from the committed README and package metadata without restoring or
changing those files. Restore the working tree through the normal Git process
before using the commands below.


Prerequisites
-------------

- Node.js 24.x, as required by the repository package configuration.
- Yarn 4.5.0.
- Docker when local Redis or other support services are required.
- Azure CLI with access to the rpx-aat Key Vault for AAT-backed local runs.
- Network access to AAT internal services and the HMCTS VPN where required.
- Chromium for smoke and functional tests; Firefox and WebKit for the
  cross-browser smoke suite.

Install dependencies from the repository root:

    corepack enable
    yarn install --immutable

On Windows, Git Bash or WSL is recommended for the Bash scripts.


Run the static demo locally
---------------------------

Build and package the library, then start Angular with its proxy:

    yarn package
    yarn start:ng

The Angular application is available at:

    http://localhost:3000/

The Media Viewer route is:

    http://localhost:3000/#/media-viewer

The retired compatibility route is:

    http://localhost:3000/#/dm-store

The hash routes must be opened in a browser; they are not server-side paths.


Run locally against AAT
-----------------------

The standalone demo can run locally while its bundled Express API proxies
Media Viewer requests to AAT.

Local URLs:

    Angular application: http://localhost:3000/
    Local API health:    http://localhost:1337/health

Angular proxies document, annotation, API, ICP, hearing-recording and document
assembly requests to the local API on port 1337. The local API then connects
to configured AAT services.

Prerequisites

- Install Azure CLI.
- Run az login with an identity that can read the rpx-aat Key Vault.
- Install the repository dependencies.
- Connect to the AAT network or HMCTS VPN as required.

Check access without printing a secret:

    az account show
    az keyvault secret show --vault-name rpx-aat --name show-oauth2-token --query id -o tsv

Generate the ignored local .env file:

    yarn env:populate:aat

The population script obtains the approved IDAM and S2S values from Key Vault.
Do not commit or share the generated .env file.

Validate the resolved AAT targets:

    yarn check:aat-config

Start the local API and Angular application:

    yarn start:aat

This command loads .env, enables AAT mode, builds the library assets, compiles
the local API and starts both local processes.

When Angular is already running and only the API needs restarting:

    yarn start:api:aat

Do not use yarn start:api directly for an AAT-backed run unless the local
configuration has been deliberately prepared; it does not perform the AAT
environment bootstrap.

Smoke-test the running local instance:

    yarn smoke:local:aat

Run the local AAT browser proof:

    yarn test:local:aat

The local proof checks the standalone viewer and proxy wiring. It does not
create CCD cases or DM Store documents.


Build and package the library
-----------------------------

Build the library, synchronise dependencies and build the demo:

    yarn build

Create the package archive:

    yarn package

Create a local package installation for inspection:

    yarn package:local

The published package is @hmcts/media-viewer. Review the generated dist/
contents before publishing.


Unit tests and linting
----------------------

Run Angular unit tests:

    yarn test

Run lint checks:

    yarn lint

Run the dependency audit when required:

    yarn cve:check

Run Sonar analysis when its environment is available:

    yarn sonar-scan


Playwright tests
----------------

Install browser dependencies:

    yarn test:setup:playwright-install-chromium
    yarn test:setup:playwright-install-browsers

Current test lanes include:

- Smoke: confirms the standalone viewer is ready and can render a PDF.
- Functional: fixture-backed viewer contracts for documents, annotations,
  navigation, search, redactions, comments and related controls.
- Support: reusable viewer fixtures, page objects and diagnostics.
- Accessibility: Axe, WAVE-like and screen-reader-like checks.
- Cross-browser smoke: Firefox and WebKit readiness checks.
- External service contracts: opt-in live AAT diagnostics, not a normal pull
  request gate.

Run the main lanes:

    yarn test:playwright:smoke
    yarn test:playwright:functional
    yarn test:playwright:support
    yarn test:a11y
    yarn test:crossbrowser

List selected scenarios:

    yarn test:playwright:smoke:list
    yarn test:playwright:functional:list

Run the optional external-service diagnostics only for a deliberate environment
investigation:

    yarn test:playwright:external-service-contracts

The Playwright wrappers write Odhín, JUnit, screenshots, traces and Perfetto
evidence below functional-output/tests/. Treat reports as potentially sensitive
and do not commit them.

Set PLAYWRIGHT_SKIP_INSTALL=true when the required browser has already been
installed. Set FUNCTIONAL_TESTS_WORKERS to an intentional value between 1 and
64 when changing local test capacity.


Local service overrides
-----------------------

Common ignored .env overrides include:

    PORT
    DOCASSEMBLY_URL
    DM_STORE_APP_URL
    HRS_API_URL
    ANNOTATION_API_URL
    NPA_URL
    ICP_API_URL
    IDAM_URL
    REDIRECT_URL
    S2S_URL

Only override a service when deliberately testing that integration. The
redirect URL must match an approved IDAM client registration.


Troubleshooting
---------------

The viewer is blank or toolbar assets are missing

- Restart with yarn start:aat so that the library and assets are rebuilt.
- Check the browser console and local API logs.
- Confirm that the selected document is reachable through the configured proxy.

Port 1337 is in use

- Set PORT in the ignored .env file and restart the local API.
- Keep the Angular proxy target aligned with the chosen port.

AAT secrets are missing

- Run yarn env:populate:aat again.
- Confirm Azure access to rpx-aat without printing secret values.

External service tests fail

- Confirm VPN and AAT network access.
- Confirm the relevant service URLs and credentials.
- Run the standalone smoke or fixture-backed functional suite first.

ICP integration fails

- Check ICP_API_URL and the local ICP health endpoint.
- Keep the other services on AAT unless the test specifically overrides them.
- Do not send real secrets to logs or make authenticated requests while a known
  secret-logging defect remains.


UK English and technical terminology
-------------------------------------

Use UK English in documentation, test descriptions and user-facing content:

    organisation / organisations
    authorise / authorisation
    behaviour
    centre
    colour
    customise / customisation
    licence (noun) / license (verb)
    analyse / analysed
    catalogue
    prioritise

Keep package names, Angular selectors, API routes, environment variables,
service names and test tags unchanged where they are technical contracts.


Licence
-------

This project is licensed under the MIT Licence. See LICENCE for the full text.
