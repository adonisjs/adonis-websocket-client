module.exports = {
  ui: 'mocha-bdd',
  builder: 'zuul-builder-webpack',
  webpack: require('./webpack.config.js'),
  server: "node test/server/index.js",
  "browsers": [
    {
      "name": "chrome",
      "version": [
        "latest"
      ]
    }
  ]
}
