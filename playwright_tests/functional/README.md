# Media Viewer functional coverage

These are migrated viewer behaviour tests. The `functional` project executes
the feature files below; the separate `smoke` project supplies one standalone
PDF-readiness contract. The full product capability inventory, including
legacy-only areas and the next assurance gaps, is stored in
`mediaViewerCoverage.json` and is rendered into the Odhín report.

| Feature | File | Tests | Main contracts |
| --- | --- | ---: | --- |
| Document loading and media types | `smokeTest.spec.ts` (smoke), `documentLoading.spec.ts` (functional) | 4 across both lanes (3 functional) | Local PDF readiness and migrated local-AAT launch-path support, image loading, PDF replacement/page identity and unsupported-media diagnostics. Live AAT/DM Store retrieval remains separately tracked. |
| Zoom | `zoom.spec.ts` | 3 | PDF/image round-trip and PDF minimum/maximum boundaries |
| Page navigation | `navigation.spec.ts` | 2 | Page identity, viewport rendering, page count and first/last boundaries |
| Rotation | `rotation.spec.ts` | 5 | Image transform and PDF orientation round-trips, default-state restoration after reload for both media types, and server-supplied PDF orientation restoration from metadata |
| Search | `search.spec.ts` | 7 | Positive match, next/previous, no results, close/reset, recovery, Enter navigation and advanced-option rendered-state contracts |
| Comments panel | `comments.spec.ts` | 11 | Direct-toolbar lifecycle; create, update, delete and cancel contracts; request payloads and rehydration; stale-highlight reset/no-result/multi-result/cross-page search; rendered summary/page-link navigation; and document-isolated persistence |
| PDF annotations | `annotations.spec.ts` | 5 | Real PDF text selection, draw-box geometry through reload, selected-highlight comments through rotation/reload, two-comment collation and every-result search annotation. The Codecept delete-all journey remains active after a two-annotation Playwright contract exposed a missing DELETE request; these deterministic functional tests also need a separate AAT service-contract test. |
| Bookmarks | `bookmarks.spec.ts` | 10 (1 skipped) | All eight legacy Codecept bookmark scenarios are retired. Playwright covers highlight-origin and panel creation, update, delete/sibling promotion, single and multiple empty drafts, sorting and bulk lifecycle; rendered reorder remains skipped pending [EXUI-5097](https://tools.hmcts.net/jira/browse/EXUI-5097) |
| Print and download | `printDownload.spec.ts` | 2 | Direct and overflow toolbar actions plus exact print URL and PDF.js download URL/filename hand-off contracts |
| Multimedia playback | `multimedia.spec.ts` | 4 | MP4 readiness, real MP3 play/pause/rewind state transitions, disabled-player download fallback and unsupported-media diagnostics |
| **Functional total** | 10 feature files | **52 (1 skipped)** | Behaviour-level functional coverage |
| **Playwright total** | Functional plus smoke | **53 (1 skipped)** | Adds one standalone PDF-readiness contract |

Run the whole migrated functional suite:

```bash
yarn test:playwright:functional
```

Run one feature while developing:

```bash
yarn test:playwright:functional -- playwright_tests/functional/search.spec.ts
```
