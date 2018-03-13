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
const wss = new WebSocket.Server({ port: 8080 })
const Packets = require('@adonisjs/websocket-packet')
const url = require('url')

function sendInitPackets (requestUrl, ws) {
  const qs = new url.URLSearchParams(requestUrl.replace('/adonis-ws', ''))
  setTimeout(() => {
    if (qs.get('init') === 'event') {
      ws.send(JSON.stringify(Packets.eventPacket('chat', 'greeting', qs.get('message'))))
    }

    if (qs.get('init') === 'terminate') {
      ws.close()
    }
  })
}

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

function handleLeave (packet, ws) {
  if (packet.d.topic === 'chat') {
    ws.send(JSON.stringify(Packets.leaveAckPacket('chat')))
  }

  if (packet.d.topic === 'badleave') {
    ws.send(JSON.stringify(Packets.leaveErrorPacket('badleave', 'Cannot unsubscribe')))
  }
}

wss.on('connection', function connection (ws, req) {
  ws.send(JSON.stringify({ t: Packets.codes.OPEN, d: { clientInterval: 1000 } }))
  ws.on('error', function (error) {
    console.log(error)
  })

  ws.on('message', function (message) {
    const packet = JSON.parse(message)
    if (Packets.isJoinPacket(packet)) {
      handleJoin(packet, ws)
      return
    }

    if (Packets.isLeavePacket(packet)) {
      handleLeave(packet, ws)
    }
  })

  ws.on('close', function () {
    console.log('closing')
  })

  sendInitPackets(req.url, ws)
})
