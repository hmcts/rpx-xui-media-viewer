# Media Viewer functional coverage

These are migrated viewer behaviour tests. The `functional` project executes
the feature files below and uses deterministic route fakes where a viewer
contract needs a service response. The separate `smoke` project supplies one standalone
PDF-readiness contract. The full product capability inventory, including
legacy-only areas and the next assurance gaps, is stored in
`mediaViewerCoverage.json` and is rendered into the Odhín report.

| Feature | File | Tests | Main contracts |
| --- | --- | ---: | --- |
| Document loading and media types | `smokeTest.spec.ts` (smoke), `documentLoading.spec.ts` (functional) | 6 across both lanes (5 functional) | Local PDF readiness, image loading, PDF replacement/page identity, unsupported-media diagnostics, and separate failed PDF/image viewer states. |
| Zoom | `zoom.spec.ts` | 3 | PDF/image round-trip and PDF minimum/maximum boundaries |
| Page navigation | `navigation.spec.ts` | 3 | Page identity, viewport rendering, page count and first/last boundaries plus wrapper toolbar-toggle enablement |
| Rotation | `rotation.spec.ts` | 7 | Image transform and PDF orientation round-trips, reset after PDF replacement, default-state restoration after reload for both media types, server-supplied PDF orientation restoration from metadata, and rotated text-highlight alignment |
| Search | `search.spec.ts` | 7 | Positive match, next/previous, no results, close/reset, recovery, Enter navigation and advanced-option rendered-state contracts |
| Comments panel | `comments.spec.ts` | 12 | Direct-toolbar lifecycle; create, update, delete and cancel contracts; request payloads and rehydration; stale-highlight reset/no-result/multi-result/cross-page search; rendered summary/page-link navigation; document-isolated persistence; close-after-search; and long-comment ellipsis rendering |
| PDF annotations | `annotations.spec.ts` | 10 | Real PDF text selection, distinct two-marker draw-box geometry through reload, requested-page draw-box geometry, selected-highlight comments through rotation/reload, textual and non-textual comment update/delete, two-comment collation, every-result search annotation and individual DELETE requests for every existing highlight, all with a stateful annotation-service fake. |
| Image annotations and comments | `annotations.spec.ts` | 4 | Four real-browser Functional contracts map the historical create, draw-box, update and delete behaviours one-for-one against the same stateful annotation-service fake. Update and delete run by default; create and draw-box remain discoverable but excluded by [EXUI-5124](https://tools.hmcts.net/jira/browse/EXUI-5124), because the current product does not persist an image draw-box annotation. |
| Office document conversion | `officeConversion.spec.ts` | 1 | Word conversion request and returned-PDF rendering using a deterministic document-assembly response. The Viewer does not own upstream conversion failure diagnostics. |
| Bookmarks | `bookmarks.spec.ts` | 13 | All eight legacy Codecept bookmark scenarios are retired. Playwright covers highlight-origin and panel creation, update, delete/sibling promotion, single and multiple empty drafts, sorting, rendered drag-reorder persistence, and bulk lifecycle. |
| Print and download | `printDownload.spec.ts` | 2 | Direct and overflow toolbar actions plus exact print URL and PDF.js download URL/filename hand-off contracts |
| Redaction | `redactions.spec.ts` | 12 | Playwright covers all 12 historical redaction scenarios through real draw-box and text-selection gestures, combined markers, full-page and multi-page redaction, download then text-redaction sequencing, single-marker and clear-all deletion, preview state, search/redact-all persistence, redaction request payload, downloaded PDF filename and post-download reset. It exceeds legacy coverage with multi-page save aggregation, multi-page clear/reload and multi-page selective-delete/reload contracts, all against deterministic redaction-service responses. |
| Multimedia playback | `multimedia.spec.ts` | 4 | Chromium-only MP4 readiness and real MP3 play/pause/rewind state transitions, disabled-player download fallback and unsupported-media diagnostics |
| In-court presentation (ICP) | — | 0 | Not claimed in Playwright. Add leader/follower page, zoom and rotation synchronisation after a separate product fix; live session-service/Web PubSub coverage remains separately tracked. |
| **Functional total** | 13 feature files | **84 default / 86 with EXUI-5124 opt-in** | Matches current Playwright functional discovery. The two tagged image-create/draw contracts remain discoverable but are excluded from default execution while the known product defect is resolved. |
| **Playwright migration total** | Functional plus smoke | **85 default / 87 with EXUI-5124 opt-in** | Matches functional discovery plus one standalone PDF-readiness contract. External AAT/CCD diagnostics are intentionally excluded from normal migration assurance. Support checks are reported separately. |

Run the whole migrated functional suite:

```bash
yarn test:playwright:functional
```

The capability report uses `Migration status` for parity and `Default execution`
for normal CI selection. The opt-in external-service contracts and the two
EXUI-5124 defect contracts remain migrated and discoverable, but are not counted
as default CI execution.

Run one feature while developing:

```bash
yarn test:playwright:functional -- playwright_tests/functional/search.spec.ts
```
