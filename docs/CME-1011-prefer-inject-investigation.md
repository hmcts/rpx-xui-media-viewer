# CME-1011: Angular ESLint `prefer-inject` investigation

## Impact confirmed

Running the Media Viewer source with `@angular-eslint/prefer-inject` set to `error` exposed 152 constructor-injection findings. The findings were distributed across 61 implementation files under `projects/media-viewer/src/lib`, including components, directives, services, NgRx effects, and the PDF wrapper factory. This was not isolated to a single service.

Constructors in NgRx action classes and model classes are not dependency-injection constructors and are therefore intentionally unchanged.

## Migration assessment

The repository baseline used for this investigation currently has Angular `20.3.26` and Angular ESLint `20.3.0`. The installed Angular schematic was used to remove the known `prefer-inject` blocker ahead of the Angular 22 upgrade; Angular 22 dependency alignment remains outside this task.

The Angular migration was assessed with:

```sh
yarn ng generate @angular/core:inject --dry-run --defaults
```

The dry run selected only Media Viewer library implementation files. The migration was then applied with:

```sh
yarn ng generate @angular/core:inject --defaults
```

The generated changes replace injectable constructor parameters with field initializers using `inject()`. Constructors that contain real initialization logic remain in place without injectable parameters.

The schematic cannot update tests that directly call the old constructors. Those tests were manually changed to instantiate the migrated classes with `runInInjectionContext()` and explicit mock providers, preserving their existing unit-test isolation and behaviour.

## Rule status

The root ESLint override is re-enabled as:

```json
"@angular-eslint/prefer-inject": "error"
```

No suppression remains for this rule.

## Validation

The following checks pass:

- `yarn tsc --noEmit -p projects/media-viewer/tsconfig.spec.json`
- `yarn lint`
- `yarn ng build media-viewer --configuration production`
- `yarn build:demo`
- `yarn ng test media-viewer --watch=false` (`924 SUCCESS`)

The demo build still reports its existing CommonJS optimization and unused mock-data warnings; they are unrelated to dependency injection or this lint rule.

## Wider pipeline assessment

This repository contains the Media Viewer library and its demo application. The migration dry run found affected injectable constructors only in `projects/media-viewer/src/lib`; the demo application and Node API did not require migration. The remaining parameter-property constructors found in the library are NgRx actions rather than Angular dependency injection.

Together with the dev-lead finding that the relevant Media Viewer pattern is not used by other pipelines, there is no current evidence of wider pipeline impact. No additional pipeline sub-tasks are recommended for CME-1011. If another pipeline later enables the rule and produces findings, that lint output should be attached to CME-1011 before creating follow-up work.
