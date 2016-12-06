module.exports = {
  ui: 'mocha-bdd',
  builder: 'zuul-builder-webpack',
  webpack: require('./webpack.config.js'),
  server: "node test/server/index.js",
  tunnel: {
    type: 'ngrok',
    proto: 'tcp',
    authtoken: 'THJf9f3AMGZTCmBQte8W_76ur9URxAK3XwTqPbKuRe'
  },
  browsers: [
    {
      name: "chrome",
      version: ["latest"]
    },
    {
      name: "ie",
      version: ["9..latest"]
    },
    {
      name: "safari",
      version: ["latest"]
    },
    {
      name: "firefox",
      version: ["latest"]
    }
  ]
}
