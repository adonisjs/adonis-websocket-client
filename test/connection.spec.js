'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import adonisWs from '../index.js'

group('Connection', (group) => {
  group.afterEach(() => {
    return new Promise((resolve) => {
      window.connection.on('close', () => {
        console.log('closing')
        resolve()
      })
      window.connection.terminate()
    })
  })

  test('make a new websocket connection to the server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', function (payload) {
      assert.property(payload, 'clientInterval')
      done()
    })
  })

  test('invoke joinAck on socket when join ack is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {
        assert.isTrue(true)
        done()
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('invoke joinError on socket when join error is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    class FakeSocket {
      constructor () {
        this.topic = 'badjoin'
      }

      joinError (packet) {
        assert.deepEqual(packet, { topic: 'badjoin', message: 'Cannot subscribe' })
        done()
      }
    }

    window.connection.subscriptions.badjoin = new FakeSocket()
  })

  test('invoke leaveAck on socket when leave ack packet is received', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    class FakeSocket {
      constructor () {
        this.topic = 'serverleave'
      }

      joinAck () {}

      leaveAck () {
        assert.isTrue(true)
        done()
      }
    }

    window.connection.subscriptions.serverleave = new FakeSocket()
  })

  test('invoke serverEvent method on socket when event from server is received', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'event',
        message: 'Hello world'
      }
    })

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {}

      serverEvent (packet) {
        assert.deepEqual(packet, { topic: 'chat', event: 'greeting', data: 'Hello world' })
        done()
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('send join request on server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.on('ready', () => {
        assert.deepEqual(window.connection.subscriptions, { 'chat': subscription })
        done()
      })
    })
  })

  test('remove subscriptions when join is errored out from server', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('badjoin')
      subscription.on('error', () => {
        setTimeout(() => {
          assert.deepEqual(window.connection.subscriptions, {})
          assert.equal(subscription.emitter.listenerCount(), 0)
          done()
        })
      })
    })
  })

  test('send leave request when close is called on subscription', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.on('ready', () => {
        subscription.close()
      })

      subscription.on('close', () => {
        assert.deepEqual(window.connection.subscriptions, {})
        done()
      })
    })
  })

  test('emit leaveError when server denies to unsubscribe from the topic', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('badleave')
      subscription.on('ready', () => {
        subscription.close()
      })

      subscription.on('close', () => {
        assert.throw('Never expected it to be called')
        done()
      })

      subscription.on('leaveError', () => {
        assert.deepEqual(window.connection.subscriptions, { badleave: subscription })
        assert.equal(subscription.state, 'closing')
        done()
      })
    })
  })

  test('close subscription when server initiates the subscription leave', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('serverleave')
      subscription.on('close', () => {
        assert.deepEqual(window.connection.subscriptions, {})
        assert.equal(subscription.state, 'closed')
        done()
      })
    })
  })

  test('do not send subscription packet unless connected to the server', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      autoconnect: false
    })

    window.connection.sendPacket = function (packet) {
      assert.throw('Never expected to be called')
    }

    window.connection.subscribe('chat')
    done()
  })

  test('attempt to reconnect when connection closes unexpectedly', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'terminate'
      }
    })

    window.connection._reconnect = function () {
      done()
    }
  })

  test('do not attempt to reconnect when terminated from client', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080')

    window.connection._reconnect = function () {
      assert.throw('Never expected to be called')
    }

    window.connection.close()
    setTimeout(() => {
      done()
    }, 400)
  })

  test('emit right set of events in correct order', (assert, done) => {
    const events = []
    window.connection = adonisWs('ws://localhost:8080', {
      autoconnect: false
    })

    window.connection.on('open', () => {
      events.push('connection:open')
    })

    window.connection.on('close', () => {
      events.push('connection:close')
      assert.deepEqual(events, ['connection:open', 'subscription:ready', 'subscription:close', 'connection:close'])
      assert.deepEqual(window.connection.subscriptions, {})
      done()
    })

    const subscription = window.connection.subscribe('chat')
    subscription.on('ready', () => {
      events.push('subscription:ready')
      window.connection.close()
    })

    subscription.on('close', () => {
      events.push('subscription:close')
    })

    window.connection.connect()
  })

  test('calling subscribe and close together should close the subscription eventually', (assert, done) => {
    const events = []
    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.close()

      subscription.on('ready', () => {
        events.push('ready')
      })

      subscription.on('close', () => {
        events.push('close')
        assert.deepEqual(events, ['ready', 'close'])
        assert.deepEqual(window.connection.subscriptions, {})
        done()
      })
    })
  })

  test('do not emit until subscription is ready', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('badjoin')
      subscription.emit('hi', 'hello')

      subscription.on('close', () => {
        assert.deepEqual(subscription._emitBuffer, [{ event: 'hi', data: 'hello' }])
        assert.deepEqual(window.connection.subscriptions, {})
        done()
      })
    })
  })
})
