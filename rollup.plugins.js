module.exports = [
  require('rollup-plugin-node-resolve')({
    main: true,
    jsnext: true,
    browser: true
  }),
  require('rollup-plugin-commonjs')(),
  require('rollup-plugin-babel')({
    exclude: 'node_modules/**',
    plugins: ['external-helpers'],
    presets: [
      [
        'env',
        {
          modules: false,
          exclude: ['transform-es2015-classes'],
          targets: {
            browsers: ['last 4 versions', 'safari >= 7', 'ie 11']
          }
        }
      ]
    ]
  })
]
