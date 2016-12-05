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

describe('Channel', function () {
  it('should initiate a new channel', function () {
    const channel = new Channel('/foo', {})
    assert.instanceOf(channel, Channel)
  })

  it('should return XHR error when trying to connect to undefined namespace', function (done) {
    this.timeout(7000)
    const channel = new Channel(io, baseUrl, '/hello', {})
    channel.connect(function (error, connected) {
      assert.equal(error.message, 'xhr poll error')
      assert.equal(connected, false)
      channel.disconnect()
      done()
    })
  })

  it('should connect to the channel namespace when connect method is called', function (done) {
    this.timeout(7000)
    const channel = new Channel(io, baseUrl, '/', {})
    channel.connect(function (error, connected) {
      assert.isNull(error)
      assert.equal(connected, true)
      channel.disconnect()
      done()
    })
  })

  it('should emit join:ad:room event when joinRoom method is called', function (done) {
    this.timeout(7000)
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
    this.timeout(7000)
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
    this.timeout(7000)
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withJwt('foobar').connect()
    channel.on('received:jwt', function () {
      channel.disconnect()
      done()
    })
  })

  it('should pass the api token as query param when withApi is called', function (done) {
    this.timeout(7000)
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withApiKey('foobar').connect()
    channel.on('received:api', function () {
      channel.disconnect()
      done()
    })
  })

  it('should pass the basic auth credentials with withBasicAuth method is called', function (done) {
    this.timeout(7000)
    const channel = new Channel(io, baseUrl, '/', {})
    channel.withBasicAuth('foo', 'bar').connect()
    channel.on('received:basic:auth', function (basicAuthString) {
      assert.equal(basicAuthString, 'Basic Zm9vOmJhcg==')
      channel.disconnect()
      done()
    })
  })
})
