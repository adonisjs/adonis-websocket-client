'use strict'

/*
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const Channel = require('../Channel')
let socketIo = null

class Ws {

  constructor (baseUrl, options) {
    this._baseUrl = baseUrl
    this._options = options
    this._channelsPool = {}
  }

  /**
   * Returns a new/existing channel instance to fire/listen
   * for events.
   *
   * @param  {String} namespace
   * @param  {Object} [options]
   *
   * @return {Object}
   */
  channel (namespace, options) {
    options = options || _.cloneDeep(this._options)
    this._channelsPool[namespace] = this._channelsPool[namespace] || new Channel(socketIo, this._baseUrl, namespace, options)
    return this._channelsPool[namespace]
  }
}

class WsManager {
  constructor (io) {
    socketIo = io
    return (url, options) => new Ws(url, options)
  }
}

module.exports = WsManager
