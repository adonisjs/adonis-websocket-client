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

    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', function (payload) {
      try {
        assert.property(payload, 'clientInterval')
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  test('invoke joinAck on socket when join ack is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {
        try {
          assert.isTrue(true)
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('invoke joinError on socket when join error is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    class FakeSocket {
      constructor () {
        this.topic = 'badjoin'
      }

      joinError (packet) {
        try {
          assert.deepEqual(packet, { topic: 'badjoin', message: 'Cannot subscribe' })
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.badjoin = new FakeSocket()
  })

  test('invoke leaveAck on socket when leave ack packet is received', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

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
    }).connect()

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {}

      serverEvent (packet) {
        try {
          assert.deepEqual(packet, { topic: 'chat', event: 'greeting', data: 'Hello world' })
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('send join request on server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.on('ready', () => {
        try {
          assert.deepEqual(window.connection.subscriptions, { 'chat': subscription })
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('remove subscriptions when join is errored out from server', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('badjoin')
      subscription.on('error', () => {
        setTimeout(() => {
          try {
            assert.deepEqual(window.connection.subscriptions, {})
            assert.equal(subscription.emitter.listenerCount(), 0)
            done()
          } catch (error) {
            done(error)
          }
        })
      })
    })
  })

  test('send leave request when close is called on subscription', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.on('ready', () => {
        subscription.close()
      })

      subscription.on('close', () => {
        try {
          assert.deepEqual(window.connection.subscriptions, {})
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('emit leaveError when server denies to unsubscribe from the topic', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080').connect()

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
        try {
          assert.deepEqual(window.connection.subscriptions, { badleave: subscription })
          assert.equal(subscription.state, 'closing')
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('close subscription when server initiates the subscription leave', (assert, done) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('serverleave')
      subscription.on('close', () => {
        try {
          assert.deepEqual(window.connection.subscriptions, {})
          assert.equal(subscription.state, 'closed')
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('do not send subscription packet unless connected to the server', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080')

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
    }).connect()

    window.connection._reconnect = function () {
      done()
    }
  })

  test('do not attempt to reconnect when terminated from client', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080').connect()

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
    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      events.push('connection:open')
    })

    window.connection.on('close', () => {
      events.push('connection:close')
      try {
        assert.deepEqual(events, ['connection:open', 'subscription:ready', 'subscription:close', 'connection:close'])
        assert.deepEqual(window.connection.subscriptions, {})
        done()
      } catch (error) {
        done(error)
      }
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
    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('chat')
      subscription.close()

      subscription.on('ready', () => {
        events.push('ready')
      })

      subscription.on('close', () => {
        events.push('close')
        try {
          assert.deepEqual(events, ['ready', 'close'])
          assert.deepEqual(window.connection.subscriptions, {})
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('do not emit until subscription is ready', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection.on('open', () => {
      const subscription = window.connection.subscribe('badjoin')
      subscription.emit('hi', 'hello')

      subscription.on('close', () => {
        try {
          assert.deepEqual(subscription._emitBuffer, [{ event: 'hi', data: 'hello' }])
          assert.deepEqual(window.connection.subscriptions, {})
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  })

  test('pass jwt token as query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withJwtToken('foo').connect()

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {}

      serverEvent (packet) {
        try {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'foo' })
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('pass api token as query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withApiToken('foo').connect()

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {}

      serverEvent (packet) {
        try {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'foo' })
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })

  test('pass basic auth credentials query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withBasicAuth('virk', 'secret').connect()

    class FakeSocket {
      constructor () {
        this.topic = 'chat'
      }

      joinAck () {}

      serverEvent (packet) {
        try {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'dmlyazpzZWNyZXQ=' })
          done()
        } catch (error) {
          done(error)
        }
      }
    }

    window.connection.subscriptions.chat = new FakeSocket()
  })
})
