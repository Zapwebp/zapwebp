'use strict';

const path = require('node:path');
const fs = require('node:fs');

const BLADE_COMPONENTS_DIR = __dirname;
const BLADE_COMPONENTS = [
  'dropzone',
  'toast',
  'banner',
  'modal',
  'card',
  'button',
  'progress',
];

/**
 * Returns raw Blade template content for a component.
 * @param {string} name
 * @returns {string}
 */
function getBladeTemplate(name) {
  const filePath = path.join(BLADE_COMPONENTS_DIR, `${name}.blade.php`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Blade template "${name}" not found.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
  BLADE_COMPONENTS_DIR,
  BLADE_COMPONENTS,
  getBladeTemplate,
};

