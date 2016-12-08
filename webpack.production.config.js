const webpack = require('webpack')

module.exports = {
  entry: './index.js',
  output: {
    path: './dist',
    filename: 'ws.min.js',
    libraryTarget: 'umd',
    library: 'ws'
  },
  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.AggressiveMergingPlugin()
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel'
    }]
  }
}
