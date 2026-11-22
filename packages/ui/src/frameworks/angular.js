'use strict';

/**
 * @zapwebp/ui/angular — Angular 17+ Framework Adapter
 * Directive and component bindings for Angular standalone applications.
 */

const { defineCustomElements } = require('../components/custom-elements');
const { showError, dismissAllErrors, resolveError } = require('../errors');
const { createZapStore, useZapStore } = require('../state');

/**
 * Angular Service / Helper for Zapwebp Error and State management
 */
class ZapUiService {
  constructor() {
    this.showError = showError;
    this.dismissAll = dismissAllErrors;
    this.resolveError = resolveError;
    this.createStore = createZapStore;
    this.useStore = useZapStore;
  }
}

/**
 * Ensures Zapwebp Custom Elements are registered in browser environment
 */
function provideZapUi() {
  if (typeof window !== 'undefined') {
    defineCustomElements();
  }
  return {
    provide: ZapUiService,
    useClass: ZapUiService,
  };
}

module.exports = {
  provideZapUi,
  ZapUiService,
  defineCustomElements,
  showError,
  dismissAllErrors,
  resolveError,
};
