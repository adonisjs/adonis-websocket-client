# Adonis WebSocket Client

```javascript
const Ws = require('adonis-websocket-client')
const io = Ws('http://localhost') // base url
const chat = io.channel('/chat').connect(function (error) {
}) // connect to channel if not already connected

chat.on('')
chat.emit('')

chat.joinRoom('room-name', function (error, joined) {
})
```
