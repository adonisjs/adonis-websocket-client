'use strict'

/*
* adonis-websocket-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/*
|--------------------------------------------------------------------------
| QUnit runner
|--------------------------------------------------------------------------
|
| Karma sauce launcher sucks badly. Qunit is simple and we just need it
| to make sure that we are bundling anything that will break on different
| browsers.
|
| This file will bundle `test/qunit/*.spec.js` files and run them using
| the Qunit runner.
|
*/

const chalk = require('chalk')
const path = require('path')
const rollup = require('rollup')
const opn = require('opn')
const ngrok = require('ngrok')
const ws = require('./server')
const saucelabs = require('./saucelabs')
const config = require('../test/qunit/rollup.config.js')
const PORT = 8081

/**
 * The browsers on which to run tests
 *
 * @type {Array}
 */
const browsers = [
  ['Windows 7', 'chrome', 'latest'],
  ['Windows 7', 'firefox', 'latest'],
  ['OS X 10.11', 'safari', 'latest'],
  ['Windows 8.1', 'internet explorer', '11'],
  ['Windows 10', 'MicrosoftEdge', 'latest']
]

/**
 * The Html template used to run Qunit tests
 *
 * @method qUnitTemplate
 *
 * @param  {String}      code
 * @param  {String}      wsUrl
 *
 * @return {String}
 */
const qUnitTemplate = function (code, wsUrl) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title></title>
      <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.4.1.css">
      <script src="https://code.jquery.com/qunit/qunit-2.4.1.js"></script>
      <script type="text/javascript">
        window.wsUrl = '${wsUrl}'
      </script>
      <script type="text/javascript">
        ${code}
      </script>
    </head>
    <body>
      <div id="qunit"></div>
    </body>
  </html>`
}

/**
 * Creating rollup bundle for testing. This is not the source code
 * bundle, instead the bundle of tests and it's setup code.
 *
 * Check the config file inside `test/qunit` dir to know more
 *
 * @method createBundle
 *
 * @return {String}
 */
async function createBundle () {
  console.log(chalk`{cyan creating test bundle...}`)

  const bundle = await rollup.rollup(config)
  const { code } = await bundle.generate({
    file: path.join(__dirname, '../tmp', 'qunit.js'),
    format: 'iife',
    name: 'wsSpec'
  })

  console.log(chalk`{green bundle generated}`)
  return code
}

/**
 * Starts the websocket and testing http server
 *
 * @method start
 *
 * @return {void}
 */
async function start () {
  let exitCode = 0
  let wsUrl = 'ws://localhost:8081'
  let server = null
  let code = null

  function serverHTML (req, res) {
    const html = qUnitTemplate(code, wsUrl)
    res.writeHead(200, { 'content-type': 'text/html' })
    res.write(html)
    res.end()
  }

  try {
    code = await createBundle()
    server = ws.start(serverHTML, PORT)

    if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
      console.log(chalk`{yellow pass SAUCE_USERNAME & SAUCE_ACCESS_KEY to run tests on saucelabs}`)
      console.log(chalk`{yellow Also make sure to quit this process manually}`)
      opn(`http://localhost:${PORT}`)
      return
    }

    /**
     * Ngrok url
     */
    const publicUrl = await saucelabs.getPublicUrl(PORT)
    wsUrl = `${publicUrl.replace('http', 'ws')}`
    console.log(chalk`started ngrok tunnel on {green ${publicUrl}}`)

    /**
     * Creating jobs with sauce labs
     */
    const jobs = await saucelabs.createTestsJob(browsers, publicUrl)
    console.log(chalk`created {green ${jobs.length} jobs}`)

    /**
     * Monitoring jobs for results
     */
    console.log(chalk`{magenta monitoring jobs}`)
    const results = await saucelabs.getJobsResult(jobs)

    /**
     * Got some results
     */
    results.forEach((result) => {
      console.log('')
      console.log(chalk`{bold ${result.platform.join(' ')}}`)
      console.log(chalk`  {green Passed ${result.result.passed}}`)
      console.log(chalk`  {red Failed ${result.result.failed}}`)
      console.log(`  Total ${result.result.total}`)
    })

    /**
     * Creating a new build to be annotated
     */
    const buildId = `build-${new Date().getTime()}`
    console.log('annotating jobs result')

    for (let result of results) {
      await saucelabs.annotateJob(result.job_id, buildId, result.result.failed === 0)
    }

    console.log(chalk`{green done}`)
  } catch (error) {
    console.log(chalk`{red received error}`)
    console.log(error)
    exitCode = 1
  }

  ngrok.kill()
  server.close()
  ws.stop()
  process.exit(exitCode)
}

start()
  .then(console.log)
  .catch(console.log)
