'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const basePlugins = require('../../rollup.plugins.js')

/**
 * Do replace the `process.env.NODE_ENV` block
 */
const pluginReplace = require('rollup-plugin-replace')({
  'process.env.NODE_ENV': JSON.stringify('development')
})

/**
 * Babel transforms, just for testing
 */
const babelPlugin = require('rollup-plugin-babel')({
  ignore: /node_modules\/(!emittery).*/,
  plugins: ['external-helpers', 'transform-object-assign'],
  presets: [
    [
      'env',
      {
        modules: false
      }
    ]
  ]
})

/**
 * Entry is not required, since karma test file will be the entry file
 *
 * @type {Object}
 */
module.exports = {
  plugins: basePlugins.concat([pluginReplace, babelPlugin]),
  output: {
    format: 'iife',
    name: 'WsTest',
    sourcemap: 'inline'
  }
}
