'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const server = require('http').createServer(function () {})
const io = require('socket.io')(server)
io.on('connection', (socket) => {

  if (socket.request._query.token) {
    socket.emit('received:jwt')
    socket.emit('received:api')
  }

  if (socket.request._query.basic) {
    socket.emit('received:basic:auth', socket.request._query.basic)
  }

  socket.on('join:ad:room', (payload) => {
    socket.emit('received:join:ad:room', payload)
  })

  socket.on('leave:ad:room', (payload) => {
    socket.emit('received:leave:ad:room', payload)
  })
})
server.listen(4000)
