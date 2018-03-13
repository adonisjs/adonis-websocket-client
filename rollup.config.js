import pkg from './package.json'
import uglify from 'rollup-plugin-uglify'
import stripCode from 'rollup-plugin-strip-code'
import strip from 'rollup-plugin-strip'

const plugins = require('./rollup.plugins.js')

const pluginUglify = uglify()

const pluginStripCode = stripCode({
  start_comment: 'DEV',
  end_comment: 'END_DEV'
})

const pluginStrip = strip({
  functions: ['debug']
})

export default [
  {
    input: 'index.js',
    output: {
      file: pkg.browser,
      name: 'adonis.Ws',
      format: 'umd'
    },
    plugins
  },
  {
    input: 'index.js',
    output: {
      file: `${pkg.browser.replace('.js', '.min.js')}`,
      name: 'adonis.Ws',
      format: 'umd'
    },
    plugins: plugins.concat([pluginStrip, pluginStripCode, pluginUglify])
  },
  {
    input: 'index.js',
    output: {
      file: pkg.module,
      format: 'es'
    },
    plugins
  },
  {
    input: 'index.js',
    output: {
      file: `${pkg.module.replace('.js', '.prod.js')}`,
      format: 'es'
    },
    plugins: plugins.concat([pluginStrip, pluginStripCode])
  }
]
