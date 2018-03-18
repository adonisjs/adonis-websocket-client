const { spawn } = require('child_process')
const chalk = require('chalk')
const ws = require('./server')

ws.start(null, 8080)
console.log(chalk`{green > started websocket server on port 8080}`)

const test = spawn('npm', ['run', 'test:karma:local'])
test.stdout.on('data', (data) => console.log(data.toString('utf-8')))
test.stderr.on('data', (data) => console.log(data.toString('utf-8')))

test.on('close', (code) => {
  ws.stop()
  console.log(chalk`{green > closing websocket server}`)
  process.exit(code)
})
