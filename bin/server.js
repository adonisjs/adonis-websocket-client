'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const WebSocket = require('ws')
const http = require('http')
const Packets = require('@adonisjs/websocket-packet')
const url = require('url')

/**
 * Sends event packets based upon the query string on the
 * connection URL
 *
 * @method sendInitPackets
 *
 * @param  {String}        requestUrl
 * @param  {Object}        ws
 *
 * @return {void}
 */
function sendInitPackets (requestUrl, ws) {
  ws.send(JSON.stringify({ t: Packets.codes.OPEN, d: { clientInterval: 1000 } }))

  const qs = new url.URLSearchParams(requestUrl.replace('/adonis-ws', ''))
  setTimeout(() => {
    if (qs.get('init') === 'event') {
      ws.send(JSON.stringify(Packets.eventPacket('chat', 'greeting', qs.get('message'))))
    }

    if (qs.get('init') === 'auth') {
      ws.send(JSON.stringify(Packets.eventPacket('chat', 'auth', qs.get('token') || qs.get('basic'))))
    }

    if (qs.get('init') === 'terminate') {
      ws.close()
    }
  })
}

/**
 * Handles the join requests
 *
 * @method handleJoin
 *
 * @param  {Object}   packet
 * @param  {Object}   ws
 *
 * @return {void}
 */
function handleJoin (packet, ws) {
  if (packet.d.topic === 'chat' || packet.d.topic === 'badleave') {
    ws.send(JSON.stringify(Packets.joinAckPacket(packet.d.topic)))
  }

  if (packet.d.topic === 'serverleave') {
    ws.send(JSON.stringify(Packets.joinAckPacket(packet.d.topic)))
    setTimeout(() => {
      ws.send(JSON.stringify(Packets.leavePacket('serverleave')))
    }, 500)
  }

  if (packet.d.topic === 'badjoin') {
    ws.send(JSON.stringify(Packets.joinErrorPacket('badjoin', 'Cannot subscribe')))
  }
}

/**
 * Handles the leave requests
 *
 * @method handleLeave
 *
 * @param  {Object}    packet
 * @param  {Object}    ws
 *
 * @return {void}
 */
function handleLeave (packet, ws) {
  if (packet.d.topic === 'chat') {
    ws.send(JSON.stringify(Packets.leaveAckPacket('chat')))
  }

  if (packet.d.topic === 'badleave') {
    ws.send(JSON.stringify(Packets.leaveErrorPacket('badleave', 'Cannot unsubscribe')))
  }
}

/**
 * Resends the same event back to the server
 *
 * @method replayEvent
 *
 * @param  {Object}    packet
 */
function replayEvent (packet, ws) {
  const { topic, event, data } = packet.d
  ws.send(JSON.stringify(Packets.eventPacket(topic, event, data)))
}

/**
 * On new connection
 *
 * @method onConnection
 *
 * @param  {Object}     ws
 * @param  {Object}     req
 *
 * @return {void}
 */
function onConnection (ws, req) {
  ws.on('error', console.log)
  ws.on('close', () => console.log('closing'))

  ws.on('message', function (message) {
    const packet = JSON.parse(message)
    if (Packets.isJoinPacket(packet)) {
      handleJoin(packet, ws)
      return
    }

    if (Packets.isLeavePacket(packet)) {
      handleLeave(packet, ws)
      return
    }

    if (Packets.isEventPacket(packet)) {
      replayEvent(packet, ws)
    }
  })

  sendInitPackets(req.url, ws)
}

module.exports = {
  server: null,

  start (httpFn, port = 8080) {
    httpFn = httpFn || function () {}
    this.server = http.createServer(httpFn)

    const wss = new WebSocket.Server({ server: this.server })
    wss.on('connection', onConnection)

    this.server.listen(port)
    return this.server
  },

  stop (callback) {
    this.server.close(callback)
  }
}
