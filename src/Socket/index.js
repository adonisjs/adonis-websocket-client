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
import wsp from '@adonisjs/websocket-packet'
import debug from '../Debug/index.js'

/**
 * Socket class holds details for a single subscription. The instance
 * of this class can be used to exchange messages with the server
 * on a given topic.
 *
 * @class Socket
 */
export default class Socket {
  constructor (topic, connection) {
    this.topic = topic
    this.connection = connection
    this.emitter = new Emitter()
    this._state = 'pending'
    this._emitBuffer = []
  }

  /**
   * Socket state
   *
   * @attribute state
   *
   * @return {String}
   */
  get state () {
    return this._state
  }

  /**
   * Update socket state
   */
  set state (state) {
    if (!this.constructor.states.indexOf(state) === -1) {
      throw new Error(`${state} is not a valid socket state`)
    }
    this._state = state
  }

  /**
   * A static array of internal states
   *
   * @method states
   *
   * @return {Array}
   */
  static get states () {
    return ['pending', 'open', 'closed', 'closing', 'error']
  }

  /**
   * Called when subscription is confirmed by the
   * server
   *
   * @method joinAck
   *
   * @return {void}
   */
  joinAck () {
    this.state = 'open'
    this.emitter.emit('ready', this)

    if (process.env.NODE_ENV !== 'production') {
      debug('clearing emit buffer for %s topic after subscription ack', this.topic)
    }

    /**
     * Process queued events
     */
    this._emitBuffer.forEach((buf) => (this.emit(buf.event, buf.data)))
    this._emitBuffer = []
  }

  /**
   * Called when subscription is rejected by the server
   *
   * @method joinError
   *
   * @param  {Object}  packet
   *
   * @return {void}
   */
  joinError (packet) {
    this.state = 'error'
    this.emitter.emit('error', packet)
    this.serverClose()
  }

  /**
   * Called when subscription close is acknowledged
   * by the server
   *
   * @method leaveAck
   *
   * @return {void}
   */
  leaveAck () {
    this.state = 'closed'
    this.serverClose()
  }

  /**
   * This method is invoked, when server rejects to close
   * the subscription. The state of the socket should not
   * change here
   *
   * @method leaveError
   *
   * @param  {Object}   packet
   *
   * @return {void}
   */
  leaveError (packet) {
    this.emitter.emit('leaveError', packet)
  }

  /* istanbul-ignore */
  /**
   * Add an event listener
   *
   * @method on
   */
  on (...args) {
    this.emitter.on(...args)
  }

  /* istanbul-ignore */
  /**
   * Add an event listener for once only
   *
   * @method once
   */
  once (...args) {
    this.emitter.once(...args)
  }

  /* istanbul-ignore */
  /**
   * Remove event listener(s)
   *
   * @method off
   */
  off (...args) {
    this.emitter.off(...args)
  }

  /**
   * Emit message on the subscription
   *
   * @method emit
   *
   * @param  {String} event
   * @param  {Mixed} data
   *
   * @return {void}
   */
  emit (event, data) {
    if (this.state === 'pending') {
      this._emitBuffer.push({ event, data })
      return
    }

    this.connection.sendEvent(this.topic, event, data)
  }

  /**
   * Closes the connection and removes all existing
   * listeners
   *
   * @method serverClose
   *
   * @return {Promise}
   */
  serverClose () {
    return this
      .emitter
      .emit('close', this)
      .then(() => {
        this._emitBuffer = []
        this.emitter.clearListeners()
      })
      .catch(() => {
        this._emitBuffer = []
        this.emitter.clearListeners()
      })
  }

  /**
   * Invoked when a new event is received from the server
   *
   * @method serverEvent
   *
   * @param  {String}    options.event
   * @param  {Mixed}    options.data
   *
   * @return {void}
   */
  serverEvent ({ event, data }) {
    this.emitter.emit(event, data)
  }

  /**
   * Received error on connection
   *
   * @method serverError
   *
   * @return {void}
   */
  serverError () {
    this.state = 'error'
  }

  /**
   * Sends the request on server to close the subscription, we
   * have to wait for acknowledgment too
   *
   * @method close
   *
   * @return {void}
   */
  close () {
    this.state = 'closing'
    if (process.env.NODE_ENV !== 'production') {
      debug('closing subscription for %s topic with server', this.topic)
    }
    this.connection.sendPacket(wsp.leavePacket(this.topic))
  }

  /**
   * Forcefully terminating the subscription
   *
   * @method terminate
   *
   * @return {void}
   */
  terminate () {
    this.leaveAck()
  }
}
