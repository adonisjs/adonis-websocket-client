import Ws from '../../../dist/Ws.es.js'

/**
 * Qunit tests are just written to make sure basic functionality
 * works fine on all browsers.
 *
 * For edge cases and regression, we write karma tests
 */
QUnit.module('Main', function () {
  QUnit.test('make websocket connection', function (assert) {
    const done = assert.async()

    const ws = Ws(window.wsUrl)
    ws.connect()

    ws.on('close', () => {
      done()
    })

    ws.on('open', function (payload) {
      assert.equal(payload.clientInterval, 1000)
      ws.close()
    })
  })

  QUnit.test('make subscription on chat channel', function (assert) {
    const done = assert.async()

    const ws = Ws(window.wsUrl)
    ws.connect()

    ws.on('close', () => {
      done()
    })

    ws.on('open', function (payload) {
      const chat = ws.subscribe('chat')
      chat.on('ready', (ref) => {
        assert.deepEqual(ref, chat)
        ws.close()
      })
    })
  })

  QUnit.test('exchange messages on a subscription', function (assert) {
    const done = assert.async()

    const ws = Ws(window.wsUrl)
    ws.connect()

    ws.on('close', () => {
      done()
    })

    ws.on('open', function (payload) {
      const chat = ws.subscribe('chat')

      chat.on('hello', (greeting) => {
        assert.equal(greeting, 'world')
        ws.close()
      })

      chat.emit('hello', 'world')
    })
  })

  QUnit.test('leave subscription from client', function (assert) {
    const done = assert.async()

    const ws = Ws(window.wsUrl)
    ws.connect()

    ws.on('close', () => {
      done()
    })

    ws.on('open', function (payload) {
      const chat = ws.subscribe('chat')

      chat.on('close', () => {
        assert.equal(chat.state, 'closed')
        ws.close()
      })

      chat.on('ready', () => {
        chat.close()
      })
    })
  })
})
