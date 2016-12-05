'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const WsManager = require('../src/Ws')
const Channel = require('../src/Channel')
const io = require('socket.io-client')
const chai = require('chai')
const assert = chai.assert
const baseUrl = 'http://localhost:4000'

describe('Ws', function () {
  it('should return channel instance using the channel method', function () {
    const Ws = new WsManager(io)
    const ws = Ws(baseUrl)
    const channel = ws.channel('/')
    assert.instanceOf(channel, Channel)
  })

  it('should connect to the namespace when calling the connect method on channel', function (done) {
    const Ws = new WsManager(io)
    const ws = Ws(baseUrl)
    const channel = ws.channel('/')
    channel.connect(function (error, connected) {
      assert.isNull(error)
      assert.equal(connected, true)
      channel.disconnect()
      done()
    })
  })

  it('should return the existing channel instance when channel method is called twice', function () {
    const Ws = new WsManager(io)
    const ws = Ws(baseUrl)
    const channel = ws.channel('/')
    const channel1 = ws.channel('/')
    assert.deepEqual(channel, channel1)
  })

  it('should not call the callback when connect method is called twice', function (done) {
    const Ws = new WsManager(io)
    const ws = Ws(baseUrl)
    const channel = ws.channel('/')
    channel.connect(done)
    channel.connect(done)
  })
})
