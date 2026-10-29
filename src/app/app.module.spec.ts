import { TestBed } from '@angular/core/testing';
import { Action, Store, StoreModule } from '@ngrx/store';

import { AppModule } from './app.module';

interface ImmutabilitySpecAction extends Action {
  nested?: {
    count: number;
  };
}

interface ImmutabilitySpecState {
  nested: {
    count: number;
  };
}

const initialState: ImmutabilitySpecState = {
  nested: {
    count: 0
  }
};

function expectMutationErrorToHaveBeenReported(consoleErrorSpy: jasmine.Spy): void {
  const mutationError = consoleErrorSpy.calls.allArgs().some((args) => args.some((arg) => {
    return arg instanceof TypeError &&
      arg.message.includes('Cannot assign to read only property');
  }));

  expect(mutationError).toBeTrue();
}

function mutatingReducer(
  state = initialState,
  action: ImmutabilitySpecAction
): ImmutabilitySpecState {
  switch (action.type) {
    case '[Immutability Spec] Mutate State':
      state.nested.count = state.nested.count + 1;
      return state;
    case '[Immutability Spec] Mutate Action':
      action.nested.count = action.nested.count + 1;
      return state;
    default:
      return state;
  }
}

describe('AppModule store immutability checks', () => {
  let store: Store;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AppModule,
        StoreModule.forFeature('immutabilitySpec', mutatingReducer)
      ]
    });

    store = TestBed.inject(Store);
    consoleErrorSpy = spyOn(console, 'error');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should report state mutations', () => {
    store.dispatch({
      type: '[Immutability Spec] Mutate State'
    });

    expectMutationErrorToHaveBeenReported(consoleErrorSpy);
  });

  it('should report action mutations', () => {
    store.dispatch({
      type: '[Immutability Spec] Mutate Action',
      nested: {
        count: 0
      }
    });

    expectMutationErrorToHaveBeenReported(consoleErrorSpy);
  });
});
