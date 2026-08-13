# Media Viewer functional coverage

These are migrated viewer behaviour tests, not smoke checks. Each feature file
owns a visible slice of product assurance and is executed by the `functional`
Playwright project. The full product capability inventory, including legacy-only
areas and the next assurance gaps, is stored in `mediaViewerCoverage.json` and
is rendered into the Odhín report.

| Feature | File | Tests | Main contracts |
| --- | --- | ---: | --- |
| Zoom | `zoom.spec.ts` | 3 | PDF/image round-trip and PDF minimum/maximum boundaries |
| Page navigation | `navigation.spec.ts` | 2 | Page identity, viewport rendering, page count and first/last boundaries |
| Rotation | `rotation.spec.ts` | 2 | Image transform and PDF orientation round-trip |
| Search | `search.spec.ts` | 4 | Positive match, next/previous, no results, close/reset, recovery and Enter navigation |
| Comments panel | `comments.spec.ts` | 11 | Direct-toolbar lifecycle; create, update, delete and cancel contracts; request payloads and rehydration; stale-highlight reset/no-result/multi-result/cross-page search; rendered summary/page-link navigation; and document-isolated persistence |
| Bookmarks | `bookmarks.spec.ts` | 10 (1 skipped) | All eight legacy Codecept bookmark scenarios are retired. Playwright covers highlight-origin and panel creation, update, delete/sibling promotion, single and multiple empty drafts, sorting and bulk lifecycle; rendered reorder remains skipped pending [EXUI-5097](https://tools.hmcts.net/jira/browse/EXUI-5097) |
| **Total** | 6 feature files | **32 (1 skipped)** | Behaviour-level migration coverage |

Run the whole migrated functional suite:

```bash
yarn test:playwright:functional
```

Run one feature while developing:

```bash
yarn test:playwright:functional -- playwright_tests/functional/search.spec.ts
```
