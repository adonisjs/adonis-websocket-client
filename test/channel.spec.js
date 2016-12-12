'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Channel = require('../src/Channel')
const io = require('socket.io-client')
const chai = require('chai')
const assert = chai.assert
const baseUrl = ''

global.mocha.checkLeaks = false

describe('Channel', function () {
  this.timeout(70000)
  it('should initiate a new channel', function () {
    const channel = new Channel('/foo', {})
    assert.instanceOf(channel, Channel)
  })

  it('should return XHR error when trying to connect to undefined namespace', function (done) {
    const channel = new Channel(io, baseUrl, '/hello', {timeout: 6000})
    channel.connect(function (error, connected) {
      if (error.message) {
        assert.match(error.message, /poll error/)
      } else {
        assert.match(error, 'timeout')
      }
      assert.equal(connected, false)
      channel.disconnect()
      done()
    })
  })

  it('should connect to the channel namespace when connect method is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function (error, connected) {
      assert.isNull(error)
      assert.equal(connected, true)
      channel.disconnect()
      done()
    })
  })

  it('should have nsp property when connected to a channel', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function () {
      assert.equal(channel.name, '/')
      channel.disconnect()
      done()
    })
  })

  it('should get a unique id when connected to a channel', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function () {
      assert.isDefined(channel.id)
      channel.disconnect()
      done()
    })
  })

  it('should have channel namespace prepended to the id', function (done) {
    const channel = new Channel(io, baseUrl, 'chat', {})
    channel.connect(function () {
      assert.equal(/^\/chat#\w+/.test(channel.id), true)
      channel.disconnect()
      done()
    })
  })

  it('should not have channel namespace prepended to the id when nsp is /', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function () {
      assert.notEqual(channel.id.substr(0, 1), '/')
      channel.disconnect()
      done()
    })
  })

  it('should emit join:ad:room event when joinRoom method is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function () {
      channel.on('received:join:ad:room', function (payload) {
        assert.deepEqual(payload, {room: 'lobby', body: {}})
        channel.disconnect()
        done()
      })
      channel.joinRoom('lobby')
    })
  })

  it('should emit leave:ad:room event when leaveRoom method is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function () {
      channel.on('received:leave:ad:room', function (payload) {
        assert.deepEqual(payload, {room: 'lobby', body: {}})
        channel.disconnect()
        done()
      })
      channel.leaveRoom('lobby')
    })
  })

  it('should pass the jwt token as query param when withJwt is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withJwt('foobar').connect()
    channel.on('received:jwt', function () {
      channel.disconnect()
      done()
    })
  })

  it('should pass the api token as query param when withApi is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withApiKey('foobar').connect()
    channel.on('received:api', function () {
      channel.disconnect()
      done()
    })
  })

  it('should pass the basic auth credentials with withBasicAuth method is called', function (done) {
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withBasicAuth('foo', 'bar').connect()
    channel.on('received:basic:auth', function (basicAuthString) {
      assert.equal(basicAuthString, 'Basic Zm9vOmJhcg==')
      channel.disconnect()
      done()
    })
  })
})
