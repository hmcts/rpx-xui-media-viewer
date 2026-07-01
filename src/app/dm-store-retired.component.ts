import { Component } from '@angular/core';

@Component({
  selector: 'app-dm-store-retired',
  template: `
    <div class="govuk-width-container">
      <main class="govuk-main-wrapper">
        <h1 class="govuk-heading-l">DM Store showcase retired</h1>
        <p class="govuk-body">
          Use the Media Viewer document ID input for AAT document, annotation, redaction, ICP,
          hearing-recording, and document-assembly checks.
        </p>
        <a routerLink="/media-viewer" class="govuk-button">Media Viewer</a>
      </main>
    </div>
  `,
  standalone: false
})
export class DmStoreRetiredComponent {}
