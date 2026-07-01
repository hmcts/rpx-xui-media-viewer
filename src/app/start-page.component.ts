import { Component } from '@angular/core';

@Component({
  selector: 'app-start-page',
  template: `
    <div class="govuk-width-container">
      <main class="govuk-main-wrapper">
        <div class="govuk-grid-row">
          <div class="govuk-grid-column-two-thirds">
            <h1 class="govuk-heading-l">Media Viewer</h1>
            <ul class="govuk-list">
              <li><a routerLink="/media-viewer" class="govuk-link">Media Viewer</a></li>
              <li><a routerLink="/dm-store" class="govuk-link">DM Store</a></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  `,
  standalone: false
})
export class StartPageComponent {}
