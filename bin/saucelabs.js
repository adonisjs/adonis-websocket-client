'use strict'

/*
* indicative
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const sauceLabs = exports = module.exports = {}
const got = require('got')
const ngrok = require('ngrok')

const sleep = function (time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

const getCredentials = function () {
  return Buffer.from(`${process.env.SAUCE_USERNAME}:${process.env.SAUCE_ACCESS_KEY}`).toString('base64')
}

/**
 * Makes an http request to sauceLabs
 *
 * @method makeHttpRequest
 *
 * @param  {String}        route
 * @param  {Object}        body
 * @param  {String}        [method = 'post']
 *
 * @return {Promise}
 */
const makeHttpRequest = function (route, body, method = 'post') {
  return got(`https://saucelabs.com/rest/v1/${process.env.SAUCE_USERNAME}/${route}`, {
    method,
    json: true,
    body,
    headers: {
      Authorization: `Basic ${getCredentials()}`
    }
  }).then((response) => {
    return response.body
  }).catch((error) => {
    throw error.response.body
  })
}

/**
 * Returns the nrgok tunner public url. This url is used
 * to run tests on saucelabs
 *
 * @method getPublicUrl
 *
 * @param  {Number} port
 *
 * @return {String}
 */
sauceLabs.getPublicUrl = function (port) {
  return ngrok.connect({ proto: 'http', addr: port })
}

/**
 * Create a test Job on saucelabs
 *
 * @method createTestsJob
 *
 * @param  {Array}       browsers
 * @param  {String}       url
 *
 * @return {Array}
 */
sauceLabs.createTestsJob = function (browsers, url) {
  return makeHttpRequest('js-tests', {
    platforms: browsers,
    url: url,
    framework: 'qunit'
  })
    .then((body) => body['js tests'])
}

/**
 * Pings sauce labs to get jobs result
 *
 * @method
 *
 * @param  {Array} jobs
 *
 * @return {Array}
 */
sauceLabs.pingForResult = (jobs) => {
  return makeHttpRequest('js-tests/status', { 'js tests': jobs })
}

/**
 * Returns the result of jobs when they are completed or when
 * max calls have been made to the sauce labs server.
 *
 * @method getJobsResult
 *
 * @param  {Array} jobs
 * @param  {Number} requestCalls
 *
 * @return {Object}
 */
sauceLabs.getJobsResult = async function (jobs, requestCalls = 0) {
  requestCalls++
  const result = await sauceLabs.pingForResult(jobs)

  if (result.completed || requestCalls >= 5) {
    return result['js tests']
  }

  await sleep(40000)
  return this.getJobsResult(jobs)
}

/**
 * Annotate the jobs to generate a build
 *
 * @method annotateJob
 *
 * @param  {String} jobId
 * @param  {String} buildId
 * @param  {Boolean} passed
 *
 * @return {Object}
 */
sauceLabs.annotateJob = (jobId, buildId, passed) => {
  return makeHttpRequest(`jobs/${jobId}`, { build: buildId, passed: passed }, 'put')
}
