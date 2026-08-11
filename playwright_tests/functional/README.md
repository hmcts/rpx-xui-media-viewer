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
| **Total** | 4 feature files | **11** | Behaviour-level migration coverage |

Run the whole migrated functional suite:

```bash
yarn test:playwright:functional
```

Run one feature while developing:

```bash
yarn test:playwright:functional -- playwright_tests/functional/search.spec.ts
```
