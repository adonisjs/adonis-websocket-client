'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * Base plugins
 *
 * @type {Array}
 */
module.exports = [
  require('rollup-plugin-node-resolve')({
    main: true,
    jsnext: true,
    browser: true
  }),
  require('rollup-plugin-commonjs')()
]
