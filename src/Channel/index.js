'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Socket = require('socket.io-client').Socket
const base64 = require('base-64')

class Channel {

  constructor (socketIoGlobal, url, namespace, options) {
    this._socketIoGlobal = socketIoGlobal
    this._url = url
    this._namespace = namespace === '/' ? '' : namespace
    this._options = options || {}
    this._io = null
    this._errorReported = false
    this._authQuery = null
    this._joinRoomEvent = 'join:ad:room'
    this._leaveRoomEvent = 'leave:ad:room'
  }

  /**
   * Report connection error until already
   * reported.
   *
   * @param   {Object}   error
   * @param   {Function} cb
   *
   * @private
   */
  _reportError (error, cb) {
    if (!this._errorReported) {
      cb(error, false)
      this._errorReported = true
    }
  }

  /**
   * Use basic auth username and password
   *
   * @param  {String} username
   * @param  {String} password
   *
   * @return {Object}
   */
  withBasicAuth (username, password) {
    this._authQuery = {
      basic: `Basic ${base64.encode(username + ':' + password)}`
    }
    return this
  }

  /**
   * Use JWT token when connecting
   *
   * @param  {String} token
   *
   * @return {Object}
   */
  withJwt (token) {
    this._authQuery = {token}
    return this
  }

  /**
   * Using the API token when connecting
   *
   * @param  {String} token
   *
   * @return {Object}
   */
  withApiKey (token) {
    this._authQuery = {token}
    return this
  }

  /**
   * Connect to the given channel using it's namespace.
   *
   * @param {Function} cb
   *
   * @return {Object}
   */
  connect (cb) {
    /**
     * Do not connect again if already connected
     */
    if (this._io) {
      return this
    }

    /**
     * Sending authentication querystring when one of
     * the authentication method is being called.
     */
    if (this._authQuery) {
      this._options.query = this._authQuery
    }

    this._io = this._socketIoGlobal(`${this._url}/${this._namespace}`, this._options)

    /**
     * Call the callback if defined and report errors/connect
     * event.
     */
    if (typeof (cb) === 'function') {
      this._io.on('connect_error', (error) => this._reportError(error, cb))
      this._io.on('error', (error) => this._reportError(error, cb))
      this._io.on('connect', () => cb(null, true))
    }

    return this
  }

  /**
   * Join a room using its name
   *
   * @param  {String}   roomName
   * @param  {Object}   [data]
   * @param  {Function} [cb]
   */
  joinRoom (roomName, data, cb) {
    this._io.emit(this._joinRoomEvent, {
      room: roomName,
      body: data || {}
    }, cb)
  }

  /**
   * Leave a given room by its name
   *
   * @param  {String}   roomName
   * @param  {Object}   [data]
   * @param  {Function} [cb]
   */
  leaveRoom (roomName, data, cb) {
    this._io.emit(this._leaveRoomEvent, {
      room: roomName,
      body: data || {}
    }, cb)
  }
}

/**
 * Proxying all socket methods to the channel prototype.
 */
Object.getOwnPropertyNames(Socket.prototype).forEach((method) => {
  const name = method === 'connect' ? '_connect' : method
  Channel.prototype[name] = function () {
    this._io[method].apply(this._io, arguments)
  }
})

module.exports = Channel
