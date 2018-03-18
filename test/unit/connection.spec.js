'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import adonisWs from '../../index.js'
import { BaseSocket, wrapAssert, waitFor, waitForNextTick } from './helpers/index'

group('Connection', (group) => {
  group.afterEach(() => {
    return new Promise((resolve) => {
      window.connection.on('close', resolve)
      window.connection.close()
    })
  })

  test('make a new websocket connection to the server', async (assert) => {
    assert.plan(1)
    window.connection = adonisWs('ws://localhost:8080').connect()

    const payload = await waitFor('open', window.connection)
    assert.property(payload, 'clientInterval')
  })

  test('invoke joinAck on socket when join ack is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    class FakeSocket extends BaseSocket {
      joinAck () {
        wrapAssert(done, () => {
          assert.isTrue(true)
        })
      }
    }

    window.connection.subscriptions.chat = new FakeSocket('chat')
  })

  test('invoke joinError on socket when join error is received from server', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    class FakeSocket extends BaseSocket {
      joinError (packet) {
        wrapAssert(done, () => {
          assert.deepEqual(packet, { topic: 'badjoin', message: 'Cannot subscribe' })
        })
      }
    }

    window.connection.subscriptions.badjoin = new FakeSocket('badjoin')
  })

  test('invoke leaveAck on socket when leave ack packet is received', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080').connect()

    class FakeSocket extends BaseSocket {
      leaveAck () {
        wrapAssert(done, () => {
          assert.isTrue(true)
        })
      }
    }

    window.connection.subscriptions.serverleave = new FakeSocket('serverleave')
  })

  test('invoke serverEvent method on socket when event from server is received', (assert, done) => {
    assert.plan(1)

    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'event',
        message: 'Hello world'
      }
    }).connect()

    class FakeSocket extends BaseSocket {
      serverEvent (packet) {
        wrapAssert(done, () => {
          assert.deepEqual(packet, { topic: 'chat', event: 'greeting', data: 'Hello world' })
        })
      }
    }

    window.connection.subscriptions.chat = new FakeSocket('chat')
  })

  test('send join request on server', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()
    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('chat')
    await waitFor('ready', subscription)

    assert.deepEqual(window.connection.subscriptions, { 'chat': subscription })
  })

  test('remove subscriptions when join is errored out from server', async (assert) => {
    assert.plan(2)

    window.connection = adonisWs('ws://localhost:8080').connect()
    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('badjoin')
    await waitFor('error', subscription)

    await waitForNextTick()
    assert.deepEqual(window.connection.subscriptions, {})
    assert.equal(subscription.emitter.listenerCount(), 0)
  })

  test('send leave request when close is called on subscription', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()
    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('chat')
    await waitFor('ready', subscription)
    subscription.close()

    await waitFor('close', subscription)
    assert.deepEqual(window.connection.subscriptions, {})
  })

  test('emit leaveError when server denies to unsubscribe from the topic', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()
    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('badleave')
    await waitFor('ready', subscription)
    subscription.close()

    await waitFor('leaveError', subscription)
    assert.deepEqual(window.connection.subscriptions, { badleave: subscription })
    assert.equal(subscription.state, 'closing')
  })

  test('close subscription when server initiates the subscription leave', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()
    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('serverleave')
    await waitFor('close', subscription)

    assert.deepEqual(window.connection.subscriptions, {})
    assert.equal(subscription.state, 'closed')
  })

  test('do not send subscription packet unless connected to the server', (assert) => {
    window.connection = adonisWs('ws://localhost:8080')

    window.connection.sendPacket = function (packet) {
      assert.throw('Never expected to be called')
    }

    window.connection.subscribe('chat')
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

  test('do not attempt to reconnect when terminated from client', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()

    window.connection._reconnect = function () {
      assert.throw('Never expected to be called')
    }

    window.connection.close()
    await waitForNextTick(400)
  })

  /**
   * Since we want to confirm the events order, do not await them,
   * otherwise they will be in the order we are awaiting them.
   */
  test('emit right set of events in correct order', (assert, done) => {
    const events = []
    window.connection = adonisWs('ws://localhost:8080')

    window.connection.on('open', () => {
      events.push('connection:open')
    })

    window.connection.on('close', () => {
      events.push('connection:close')
      wrapAssert(done, () => {
        assert.deepEqual(events, ['connection:open', 'subscription:ready', 'subscription:close', 'connection:close'])
        assert.deepEqual(window.connection.subscriptions, {})
      })
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

  test('calling subscribe and close together should close the subscription eventually', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()

    await waitFor('open', window.connection)
    const subscription = window.connection.subscribe('chat')
    subscription.close()

    await waitFor('ready', subscription)
    await waitFor('close', subscription)

    assert.deepEqual(window.connection.subscriptions, {})
  })

  test('do not emit until subscription is ready', async (assert) => {
    window.connection = adonisWs('ws://localhost:8080').connect()

    await waitFor('open', window.connection)

    const subscription = window.connection.subscribe('badjoin')
    subscription.emit('hi', 'hello')

    await waitFor('close', subscription)
    assert.deepEqual(subscription._emitBuffer, [{ event: 'hi', data: 'hello' }])
    assert.deepEqual(window.connection.subscriptions, {})
  })

  test('pass jwt token as query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withJwtToken('foo').connect()

    class FakeSocket extends BaseSocket {
      serverEvent (packet) {
        wrapAssert(done, () => {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'foo' })
        })
      }
    }

    window.connection.subscriptions.chat = new FakeSocket('chat')
  })

  test('pass api token as query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withApiToken('bar').connect()

    class FakeSocket extends BaseSocket {
      serverEvent (packet) {
        wrapAssert(done, () => {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'bar' })
        })
      }
    }

    window.connection.subscriptions.chat = new FakeSocket('chat')
  })

  test('pass basic auth credentials query param', (assert, done) => {
    window.connection = adonisWs('ws://localhost:8080', {
      query: {
        init: 'auth'
      }
    }).withBasicAuth('virk', 'secret').connect()

    class FakeSocket extends BaseSocket {
      serverEvent (packet) {
        wrapAssert(done, () => {
          assert.deepEqual(packet, { topic: 'chat', event: 'auth', data: 'dmlyazpzZWNyZXQ=' })
        })
      }
    }

    window.connection.subscriptions.chat = new FakeSocket('chat')
  })
})
