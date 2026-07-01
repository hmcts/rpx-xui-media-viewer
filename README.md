# @hmcts/media-viewer 
[![Node.js Package](https://github.com/hmcts/rpx-xui-media-viewer/actions/workflows/npmpublish.yml/badge.svg)](https://github.com/hmcts/rpx-xui-media-viewer/actions/workflows/npmpublish.yml)

This is an angular library that can be used to view and annotate PDF documents and images

## Running demo app
- yarn package
- yarn start:ng

## Running locally against AAT
The demo app can run locally while the bundled Express API proxies document, annotation, redaction, ICP, hearing-recording, and document-assembly calls to AAT.

1. Generate `.env` from the `rpx-aat` Key Vault:

```
yarn env:populate:aat
```

   Optional custom output path and template:

```
bash ./scripts/populate-env-from-keyvault.sh aat /tmp/media-viewer.env .env.example
```

   The script fills:
   - `IDAM_SECRET` from `show-oauth2-token`
   - `IDAM_PASSWORD` from `password`
   - `S2S_KEY` from `microservicekey-em-gw`

2. Start the local AAT-connected app:

```
yarn start:aat
```

The script compiles the API, starts it on `PORT` or `1337`, then starts the Angular demo with `proxy.config.js`. The `.env` file is ignored by git and must not be committed.

To check only the AAT endpoint configuration without starting the app:

```
yarn check:aat-config
```

The default AAT redirect URI uses the registered `xui-media-viewer` callback. Override `REDIRECT_URL` only when the IdAM client registration supports the local callback you want to use.

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
