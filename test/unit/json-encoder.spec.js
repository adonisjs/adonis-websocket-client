'use strict'

/**
 * adonis-websocket-client
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import JsonEncoder from '../../src/JsonEncoder/index.js'
import promisify from 'pify'

group('JsonEncoder', (group) => {
  test('encode value', async (assert) => {
    const payload = await promisify(JsonEncoder.encode)({ name: 'virk' })
    assert.equal(payload, JSON.stringify({ name: 'virk' }))
  })

  test('pass encoding error to callback', async (assert) => {
    assert.plan(1)

    const obj = {}
    Object.defineProperty(obj, 'name', {
      enumerable: true,
      get () {
        throw new Error('bad')
      }
    })

    try {
      await promisify(JsonEncoder.encode)(obj)
    } catch ({ message }) {
      assert.equal(message, 'bad')
    }
  })

  test('decode json string', async (assert) => {
    const payload = await promisify(JsonEncoder.decode)(JSON.stringify({ name: 'virk' }))
    assert.deepEqual(payload, { name: 'virk' })
  })
})
