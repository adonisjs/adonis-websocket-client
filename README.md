# Websocket client

```
const ws = adonisWs('ws://localhost:8000')

ws.on('open', function () {
  ws
    .subscribe('chat:watercooler')
    .then((subscription) => {
      subscription.on('')
      subscription.on('leave')
    })
    .catch((error) => {
    })
})

ws.on('close', function () {
})

ws.on('error', function () {
})
```
