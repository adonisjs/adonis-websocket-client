'use strict'

const daemon = require('daemonize2').setup({
  main: './index.js',
  name: 'testserver',
  pidfile: 'testserver.pid'
})

switch (process.argv[2]) {
  case 'start':
    daemon.start()
    break

  case 'stop':
    daemon.stop()
    break

  default:
    console.log('Usage: [start|stop]')
}
