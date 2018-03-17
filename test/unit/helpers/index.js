export function waitFor (event, target) {
  return new Promise((resolve) => {
    target.on(event, resolve)
  })
}

export function wrapAssert (done, callback) {
  try {
    callback()
    done()
  } catch (error) {
    done(error)
  }
}

export function waitForNextTick (timeout = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })
}

export class BaseSocket {
  constructor (topic, connection) {
    this.topic = topic
    this.connection = connection
  }
  joinAck () {}
  leaveAck () {}
  leaveError () {}
  joinError () {}
  terminate () {}
  serverError () {}
  emit () {}
  close () {}
}
