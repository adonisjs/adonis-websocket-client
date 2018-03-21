const pkg = require('./package')
const basePlugins = require('./rollup.plugins.js')

const pluginBabel = require('rollup-plugin-babel')({
  ignore: /node_modules\/(!emittery).*/,
  plugins: ['external-helpers', 'transform-object-assign', 'transform-regenerator'],
  presets: [
    [
      'env',
      {
        modules: false,
        targets: {
          browsers: ['last 4 versions', 'safari >= 7', 'ie 11']
        }
      }
    ]
  ]
})

const pluginBabelEs = require('rollup-plugin-babel')({
  ignore: /node_modules\/(!emittery).*/,
  plugins: ['external-helpers', 'transform-object-assign'],
  presets: [
    [
      'env',
      {
        modules: false,
        targets: {
          browsers: ['last 4 versions', 'safari >= 7', 'ie 11']
        }
      }
    ]
  ]
})

/**
 * UMD build
 *
 * @method umdBuild
 *
 * @return {Object}
 */
function umdBuild () {
  const pluginReplace = require('rollup-plugin-replace')({
    'process.env.NODE_ENV': JSON.stringify('development')
  })

  return {
    input: 'index.js',
    output: {
      file: pkg.browser,
      name: 'adonis.Ws',
      format: 'umd'
    },
    plugins: [pluginReplace].concat(basePlugins).concat([pluginBabel])
  }
}

/**
 * Umd build for production
 *
 * @method umdProductionBuild
 *
 * @return {Object}
 */
function umdProductionBuild () {
  const pluginReplace = require('rollup-plugin-replace')({
    'process.env.NODE_ENV': JSON.stringify('production')
  })

  const pluginUglify = require('rollup-plugin-uglify')()

  return {
    input: 'index.js',
    output: {
      file: `${pkg.browser.replace(/\.js$/, '.min.js')}`,
      name: 'adonis.Ws',
      format: 'umd'
    },
    plugins: [pluginReplace].concat(basePlugins).concat([pluginBabel, pluginUglify])
  }
}

/**
 * Es build
 *
 * @method esBuild
 *
 * @return {Object}
 */
function esBuild () {
  return {
    input: 'index.js',
    output: {
      file: pkg.module,
      format: 'es'
    },
    plugins: basePlugins.concat([pluginBabelEs])
  }
}

const build = process.argv.slice(3)[0]

if (build === '--umd') {
  module.exports = umdBuild()
} else if (build === '--umd-production') {
  module.exports = umdProductionBuild()
} else if (build === '--esm') {
  module.exports = esBuild()
}
