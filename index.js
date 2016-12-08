'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const io = require('socket.io-client')
const WsManager = require('./src/Ws')
module.exports = new WsManager(io)
