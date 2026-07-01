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
