// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'core-js/es7/reflect';
import 'zone.js';
import 'zone.js/testing';
import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Clear Karma's navigation guard inside the Zone-patched test frame before teardown.
// Unexpected reloads during test execution still reach Karma's original guard.
const karma = (window as unknown as {
  __karma__: { complete: (...args: unknown[]) => void };
}).__karma__;
const complete = karma.complete;
karma.complete = function (...args: unknown[]): void {
  window.onbeforeunload = null;
  complete.apply(this, args);
};

// Keep the suite on the application's Zone.js change detection model.
@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneTestingModule {}

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, ZoneTestingModule],
  platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: false }
}
);
