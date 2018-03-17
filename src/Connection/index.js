'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import Emitter from 'emittery'
import { stringify } from 'query-string'
import wsp from '@adonisjs/websocket-packet'
import extend from 'extend'

/* DEV */
import debug from '../Debug'
/* END_DEV */

import Socket from '../Socket/index.js'
import JsonEncoder from '../JsonEncoder/index.js'

export default class Connection extends Emitter {
  constructor (url, options) {
    super()

    /**
     * Connection options
     *
     * @type {Object}
     */
    this.options = Object.assign({
      path: 'adonis-ws',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      query: null,
      encoder: JsonEncoder
    }, options)

    debug('connection options %o', this.options)

    /**
     * The state connection is in
     *
     * @type {String}
     */
    this._connectionState = 'idle'

    /**
     * Number of reconnection attempts being made
     *
     * @type {Number}
     */
    this._reconnectionAttempts = 0

    /**
     * Base URL for the websocket connection
     *
     * @type {String}
     */
    this.url = `${url.replace(/\/$/, '')}/${this.options.path}`

    /**
     * Subscriptions for a single connection
     *
     * @type {Object}
     */
    this.subscriptions = {}

    /**
     * All packets are sent in sequence to the server. So we need to
     * maintain a queue and process one at a time
     *
     * @type {Array}
     */
    this._packetsQueue = []

    /**
     * Whether or not the queue is in process
     *
     * @type {Boolean}
     */
    this._processingQueue = false

    /**
     * As per Adonis protocol, the client must ping
     * the server after x interval
     *
     * @type {Timer}
     */
    this._pingTimer = null

    /**
     * Extended query is merged with the query params
     * user pass
     *
     * @type {Object}
     */
    this._extendedQuery = {}

    /**
     * Handler called when `close` is emitted from the
     * subscription
     */
    this.removeSubscription = ({ topic }) => {
      delete this.subscriptions[topic]
    }
  }

  /**
   * Computed value to decide, whether or not to reconnect
   *
   * @method shouldReconnect
   *
   * @return {Boolean}
   */
  get shouldReconnect () {
    return this._connectionState !== 'terminated' &&
    this.options.reconnection &&
    this.options.reconnectionAttempts > this._reconnectionAttempts
  }

  /**
   * Calls a callback passing subscription to it
   *
   * @method _subscriptionsIterator
   *
   * @param  {Function}             callback
   *
   * @return {void}
   *
   * @private
   */
  _subscriptionsIterator (callback) {
    Object.keys(this.subscriptions).forEach((sub) => {
      callback(this.subscriptions[sub], sub)
    })
  }

  /**
   * Calls the callback when there is a subscription for
   * the topic mentioned in the packet
   *
   * @method _ensureSubscription
   *
   * @param  {Object}            packet
   * @param  {Function}          cb
   *
   * @return {void}
   *
   * @private
   */
  _ensureSubscription (packet, cb) {
    const socket = this.getSubscription(packet.d.topic)

    if (!socket) {
      debug('cannot acknowledge join since topic has no subscription %j', packet)
      return
    }

    cb(socket, packet)
  }

  /**
   * Process the packets queue by sending one packet at a time
   *
   * @method _processQueue
   *
   * @return {void}
   *
   * @private
   */
  _processQueue () {
    if (this._processingQueue || !this._packetsQueue.length) {
      return
    }

    /**
     * Turn on the processing flag
     *
     * @type {Boolean}
     */
    this._processingQueue = true

    this.options.encoder.encode(this._packetsQueue.shift(), (error, payload) => {
      if (error) {
        debug('encode error %j', error)
        return
      }
      this.write(payload)

      /**
       * Turn off the processing flag and re call the processQueue to send
       * the next message
       *
       * @type {Boolean}
       */
      this._processingQueue = false
      this._processQueue()
    })
  }

  /**
   * As soon as connection is ready, we start listening
   * for new message
   *
   * @method _onOpen
   *
   * @return {void}
   *
   * @private
   */
  _onOpen () {
    debug('opened')
  }

  /**
   * When received connection error
   *
   * @method _onError
   *
   * @param  {Event} event
   *
   * @return {void}
   *
   * @private
   */
  _onError (event) {
    this._subscriptionsIterator((subscription) => (subscription.serverError()))
    this.emit('error', event)
  }

  /**
   * Initiates reconnect with the server by moving
   * all subscriptions to pending state
   *
   * @method _reconnect
   *
   * @return {void}
   *
   * @private
   */
  _reconnect () {
    this._reconnectionAttempts++

    const timer = setTimeout(() => {
      clearTimeout(timer)
      this._connectionState = 'reconnect'
      this.connect()
    }, this.options.reconnectionDelay * this._reconnectionAttempts)
  }

  /**
   * When connection closes
   *
   * @method _onClose
   *
   * @param  {Event} event
   *
   * @return {void}
   *
   * @private
   */
  _onClose (event) {
    clearInterval(this._pingTimer)

    this.ws = null
    this._pingTimer = null

    this._subscriptionsIterator((subscription) => subscription.terminate())

    this
      .emit('close', this)
      .then(() => {
        this.shouldReconnect ? this._reconnect() : this.clearListeners()
      })
      .catch(() => {
        this.shouldReconnect ? this._reconnect() : this.clearListeners()
      })
  }

  /**
   * When a new message was received
   *
   * @method _onMessage
   *
   * @param  {Event}   event
   *
   * @return {void}
   *
   * @private
   */
  _onMessage (event) {
    this.options.encoder.decode(event.data, (decodeError, packet) => {
      if (decodeError) {
        debug('packet dropped, decode error %o', decodeError)
        return
      }
      this._handleMessage(packet)
    })
  }

  /**
   * Handles the message packet based upon it's type
   *
   * @method _handleMessage
   *
   * @param  {Object}       packet
   *
   * @return {void}
   *
   * @private
   */
  _handleMessage (packet) {
    if (wsp.isOpenPacket(packet)) {
      debug('open packet')
      this._handleOpen(packet)
      return
    }

    if (wsp.isJoinAckPacket(packet)) {
      debug('join ack packet')
      this._handleJoinAck(packet)
      return
    }

    if (wsp.isJoinErrorPacket(packet)) {
      debug('join error packet')
      this._handleJoinError(packet)
      return
    }

    if (wsp.isLeaveAckPacket(packet)) {
      debug('leave ack packet')
      this._handleLeaveAck(packet)
      return
    }

    if (wsp.isLeaveErrorPacket(packet)) {
      debug('leave error packet')
      this._handleLeaveError(packet)
      return
    }

    if (wsp.isLeavePacket(packet)) {
      debug('leave packet')
      this._handleServerLeave(packet)
      return
    }

    if (wsp.isEventPacket(packet)) {
      debug('event packet')
      this._handleEvent(packet)
      return
    }

    if (wsp.isPongPacket(packet)) {
      debug('pong packet')
      return
    }

    debug('invalid packet type %d', packet.t)
  }

  /**
   * Emits the open emit and send subscription packets
   * for pre-existing subscriptions
   *
   * @method _handleOpen
   *
   * @param  {Object}    packet
   *
   * @return {void}
   *
   * @private
   */
  _handleOpen (packet) {
    this._connectionState = 'open'
    this.emit('open', packet.d)

    /**
     * Setup a timer to ping the server, telling
     * client is awake
     */
    this._pingTimer = setInterval(() => {
      this.sendPacket(wsp.pingPacket())
    }, packet.d.clientInterval)

    /**
     * Sending packets to make pending subscriptions
     */
    this._subscriptionsIterator((subscription) => {
      this.sendPacket(wsp.joinPacket(subscription.topic))
    })
  }

  /**
   * Handles the join acknowledgement for a subscription
   *
   * @method _handleJoinAck
   *
   * @param  {Object}       packet
   *
   * @return {void}
   *
   * @private
   */
  _handleJoinAck (packet) {
    this._ensureSubscription(packet, (socket) => socket.joinAck())
  }

  /**
   * Handles the join error for a subscription
   *
   * @method _handleJoinError
   *
   * @param  {Object}         packet
   *
   * @return {void}
   *
   * @private
   */
  _handleJoinError (packet) {
    this._ensureSubscription(packet, (socket, packet) => socket.joinError(packet.d))
  }

  /**
   * Acknowledges the subscription leave
   *
   * @method _handleLeaveAck
   *
   * @param  {Object}        packet
   *
   * @return {void}
   *
   * @private
   */
  _handleLeaveAck (packet) {
    this._ensureSubscription(packet, (socket) => socket.leaveAck())
  }

  /**
   * Handles leave error for a subscription
   *
   * @method _handleLeaveError
   *
   * @param  {Object}          packet
   *
   * @return {void}
   *
   * @private
   */
  _handleLeaveError (packet) {
    this._ensureSubscription(packet, (socket, packet) => socket.leaveError(packet.d))
  }

  /**
   * Handles when server initiates the subscription leave
   *
   * @method _handleServerLeave
   *
   * @param  {Object}           packet
   *
   * @return {void}
   *
   * @private
   */
  _handleServerLeave (packet) {
    this._ensureSubscription(packet, (socket, packet) => socket.leaveAck())
  }

  /**
   * Handles the event packet for a subscription
   *
   * @method _handleEvent
   *
   * @param  {Object}     packet
   *
   * @return {void}
   *
   * @private
   */
  _handleEvent (packet) {
    this._ensureSubscription(packet, (socket, packet) => socket.serverEvent(packet.d))
  }

  /**
   * Instantiate the websocket connection
   *
   * @method connect
   *
   * @return {void}
   */
  connect () {
    const query = stringify(extend({}, this.options.query, this._extendedQuery))
    const url = query ? `${this.url}?${query}` : this.url

    debug('creating socket connection on %s url', url)

    this.ws = new window.WebSocket(url)
    this.ws.onclose = (event) => this._onClose(event)
    this.ws.onerror = (event) => this._onError(event)
    this.ws.onopen = (event) => this._onOpen(event)
    this.ws.onmessage = (event) => this._onMessage(event)

    return this
  }

  /**
   * Writes the payload on the open connection
   *
   * @method write
   *
   * @param  {String} payload
   *
   * @return {void}
   */
  write (payload) {
    if (this.ws.readyState !== window.WebSocket.OPEN) {
      debug('connection is not in open state, current state %s', this.ws.readyState)
      return
    }

    this.ws.send(payload)
  }

  /**
   * Sends a packet by encoding it first
   *
   * @method _sendPacket
   *
   * @param  {Object}    packet
   *
   * @return {void}
   */
  sendPacket (packet) {
    this._packetsQueue.push(packet)
    this._processQueue()
  }

  /**
   * Returns the subscription instance for a given topic
   *
   * @method getSubscription
   *
   * @param  {String}        topic
   *
   * @return {Socket}
   */
  getSubscription (topic) {
    return this.subscriptions[topic]
  }

  /**
   * Returns a boolean telling, whether connection has
   * a subscription for a given topic or not
   *
   * @method hasSubcription
   *
   * @param  {String}       topic
   *
   * @return {Boolean}
   */
  hasSubcription (topic) {
    return !!this.getSubscription(topic)
  }

  /**
   * Create a new subscription with the server
   *
   * @method subscribe
   *
   * @param  {String}  topic
   *
   * @return {Socket}
   */
  subscribe (topic) {
    if (!topic || typeof (topic) !== 'string') {
      throw new Error('subscribe method expects topic to be a valid string')
    }

    if (this.subscriptions[topic]) {
      throw new Error('Cannot subscribe to same topic twice. Instead use getSubscription')
    }

    const socket = new Socket(topic, this)
    socket.on('close', this.removeSubscription)

    /**
     * Storing reference to the socket
     */
    this.subscriptions[topic] = socket

    /**
     * Sending join request to the server, the subscription will
     * be considered ready, once server acknowledges it
     */
    if (this._connectionState === 'open') {
      this.sendPacket(wsp.joinPacket(topic))
    }

    return socket
  }

  /**
   * Sends event for a given topic
   *
   * @method sendEvent
   *
   * @param  {String}  topic
   * @param  {String}  event
   * @param  {Mixed}  data
   *
   * @return {void}
   *
   * @throws {Error} If topic or event are not passed
   * @throws {Error} If there is no active subscription for the given topic
   */
  sendEvent (topic, event, data) {
    if (!topic || !event) {
      throw new Error('topic and event name is required to call sendEvent method')
    }

    /**
     * Make sure there is an active subscription for the topic. Though server will
     * bounce the message, there is no point in hammering it
     */
    const subscription = this.getSubscription(topic)
    if (!subscription) {
      throw new Error(`There is no active subscription for ${topic} topic`)
    }

    /**
     * If subscription state is not open, then we should not publish
     * messages.
     *
     * The reason we have this check on connection and not socket,
     * is coz we don't want anyone to use the connection object
     * and send packets, even when subscription is closed.
     */
    if (subscription.state !== 'open') {
      throw new Error(`Cannot emit since subscription socket is in ${this.state} state`)
    }

    this.sendPacket(wsp.eventPacket(topic, event, data))
  }

  /**
   * Use JWT token to authenticate the user
   *
   * @method withJwtToken
   *
   * @param {String} token
   *
   * @chainable
   */
  withJwtToken (token) {
    this._extendedQuery.token = token
    return this
  }

  /**
   * Use basic auth credentials to login the user
   *
   * @method withBasicAuth
   *
   * @param  {String}  username
   * @param  {String}  password
   *
   * @chainable
   */
  withBasicAuth (username, password) {
    this._extendedQuery.basic = window.btoa(`${username}:${password}`)
    return this
  }

  /**
   * Use personal API token to authenticate the user
   *
   * @method withApiToken
   *
   * @param {String} token
   *
   * @return {String}
   */
  withApiToken (token) {
    this._extendedQuery.token = token
    return this
  }

  /**
   * Forcefully close the connection
   *
   * @method close
   *
   * @return {void}
   */
  close () {
    this._connectionState = 'terminated'
    this.ws.close()
  }
}
