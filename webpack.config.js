module.exports = {
  entry: './index.js',
  output: {
    path: './dist',
    filename: 'ws.js',
    libraryTarget: 'umd',
    library: 'ws'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel'
    }]
  }
}
