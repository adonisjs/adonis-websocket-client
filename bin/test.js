const { spawn, fork } = require('child_process')

const server = fork('test/unit/helpers/server.js')

const test = spawn('npm', ['run', 'test:karma'])

test.stdout.on('data', (data) => console.log(data.toString('utf-8')))
test.stderr.on('data', (data) => console.log(data.toString('utf-8')))

test.on('close', (code) => {
  server.kill('SIGTERM')
  process.exit(code)
})
