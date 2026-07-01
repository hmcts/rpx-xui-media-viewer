import { Component } from '@angular/core';

@Component({
  selector: 'app-start-page',
  template: `
    <div class="govuk-width-container">
      <a routerLink="/dm-store" class="govuk-tag govuk-tag--grey" style="float: right">DM-Store</a>
      <main class="govuk-main-wrapper">
        <div class="govuk-grid-row">
          <div class="govuk-grid-column-two-thirds">
            <table class="govuk-table">
              <caption class="govuk-table__caption govuk-!-padding-left-2">Media Viewer</caption>
              <tbody class="govuk-table__body">
                <tr class="govuk-table__row">
                  <td class="govuk-table__cell">
                    <a class="govuk-!-padding-left-2" routerLink="/media-viewer">Media Viewer</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `,
  standalone: false
})
export class StartPageComponent {}
