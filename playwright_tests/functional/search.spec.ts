import { expect, mediaAssets, test } from '../fixtures/mediaViewerTest';

test.describe('Search', () => {
  test('finds a term in a PDF document', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await expect(mediaViewer.loadState.pdfPage(1)).toBeVisible();
    await expect(mediaViewer.loadState.pdfPage(1)).toHaveAttribute('data-loaded', 'true');

    await mediaViewer.search.searchFor('Based');
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');
  });

  test('navigates search results and reports an empty search', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await mediaViewer.search.searchFor('Based');
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');

    await mediaViewer.search.nextResult();
    await expect(mediaViewer.search.results).toHaveText('Found 2 of 24');

    await mediaViewer.search.previousResult();
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');

    await mediaViewer.search.searchFor('term-that-does-not-exist');
    await expect(mediaViewer.search.results).toHaveText('No results found');
    await expect(mediaViewer.search.nextResultButton).toHaveCount(0);

    await mediaViewer.search.close();
    await expect(mediaViewer.search.input).toBeHidden();
  });

  test('moves to the next search result when Enter activates the focused result link', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await mediaViewer.search.open();
    await mediaViewer.search.input.fill('Based');
    await mediaViewer.search.submitSearch();
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');

    await expect(mediaViewer.search.nextResultButton).toBeFocused();
    await mediaViewer.search.pressEnterOnFocusedResult();
    await expect(mediaViewer.search.results).toHaveText('Found 2 of 24');
  });

  test('recovers from empty search results to a positive match', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);

    await mediaViewer.search.searchFor('term-that-does-not-exist');
    await expect(mediaViewer.search.results).toHaveText('No results found');

    await mediaViewer.search.searchFor('Based');
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');
  });

  test('limits matches when exact case is selected', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.search.searchFor('Based');
    await expect(mediaViewer.search.results).toHaveText('Found 1 of 24');
    const allCaseMatches = Number((await mediaViewer.search.results.textContent())?.match(/of (\d+)/)?.[1]);

    expect(allCaseMatches).toBeGreaterThan(0);
    await mediaViewer.search.openAdvancedOptions();
    await mediaViewer.search.openAdvancedOptions();
    await expect(mediaViewer.search.matchCaseCheckbox).toBeVisible();
    await mediaViewer.search.matchCaseCheckbox.check();
    await expect(mediaViewer.search.matchCaseCheckbox).toBeChecked();
    await expect.poll(async () => Number((await mediaViewer.search.results.textContent())?.match(/of (\d+)/)?.[1]))
      .toBeLessThan(allCaseMatches);
  });

  test('excludes partial-word matches when whole-word search is selected', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.search.searchFor('compile');
    await expect(mediaViewer.search.results).toContainText('of');
    const partialWordMatches = Number((await mediaViewer.search.results.textContent())?.match(/of (\d+)/)?.[1]);

    expect(partialWordMatches).toBeGreaterThan(0);
    await mediaViewer.search.openAdvancedOptions();
    await mediaViewer.search.wholeWordCheckbox.check();
    await expect(mediaViewer.search.wholeWordCheckbox).toBeChecked();
    await expect.poll(async () => Number((await mediaViewer.search.results.textContent())?.match(/of (\d+)/)?.[1]))
      .toBeLessThan(partialWordMatches);
  });

  test('changes rendered PDF highlights when highlight-all is disabled and restored', { tag: ['@e2e-functional', '@feature-search'] }, async ({ mediaViewer }) => {
    await mediaViewer.openDocument(mediaAssets.pdf);
    await mediaViewer.search.searchFor('Dynamic');
    await expect.poll(() => mediaViewer.search.highlights.count()).toBeGreaterThan(1);

    await mediaViewer.search.openAdvancedOptions();
    await mediaViewer.search.highlightAllCheckbox.uncheck();
    await expect(mediaViewer.search.highlightAllCheckbox).not.toBeChecked();
    await expect.poll(() => mediaViewer.search.highlights.count()).toBe(1);

    await mediaViewer.search.highlightAllCheckbox.check();
    await expect(mediaViewer.search.highlightAllCheckbox).toBeChecked();
    await expect.poll(() => mediaViewer.search.highlights.count()).toBeGreaterThan(1);
  });
});
