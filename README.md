<p align="center">
  <a href="http://adonisjs.com"><img src="https://cloud.githubusercontent.com/assets/2793951/19925021/865beda4-a0ee-11e6-85bb-20ccd8f72211.png" alt="AdonisJs WebSocket"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/adonis-websocket-client"><img src="https://img.shields.io/npm/v/adonis-websocket-client.svg?style=flat-square" alt="Version"></a>
  <a href="https://travis-ci.org/adonisjs/adonis-websocket-client"><img src="https://img.shields.io/travis/adonisjs/adonis-websocket-client/master.svg?style=flat-square" alt="Build Status"></a>
  <a href="https://coveralls.io/github/adonisjs/adonis-websocket-client?branch=master"><img src="https://img.shields.io/coveralls/adonisjs/adonis-websocket-client/master.svg?style=flat-square" alt="Coverage Status"></a>
  <a href="https://www.npmjs.com/package/adonis-websocket-client"><img src="https://img.shields.io/npm/dt/adonis-websocket.svg?style=flat-square" alt="Downloads"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/adonis-websocket.svg?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://gitter.im/adonisjs/adonis-framework"><img src="https://img.shields.io/badge/gitter-join%20us-1DCE73.svg?style=flat-square" alt="Gitter"></a>
  <a href="https://trello.com/b/yzpqCgdl/adonis-for-humans"><img src="https://img.shields.io/badge/trello-roadmap-89609E.svg?style=flat-square" alt="Trello"></a>
  <a href="https://www.patreon.com/adonisframework"><img src="https://img.shields.io/badge/patreon-support%20AdonisJs-brightgreen.svg?style=flat-square" alt="Support AdonisJs"></a>
</p>

<p align="center">
  <a href="https://saucelabs.com/u/amanvirk">
    <img src="https://saucelabs.com/browser-matrix/amanvirk.svg" />
  </a>
</p>

<br>
This repo contains the code for websocket client to be used on frontend for communicating with AdonisJs websocket server. :rocket:

<br>
<hr>
<br>

## Table of Contents

* [Setup](#setup)
* [Getting Started](#getting-started)
* [Contribution Guidelines](#contribution-guidelines)

<br>
## <a name="requirements"></a>Setup
Feel free to use the module with **Webpack**, **Browserify** for similar build tools that supports **CommonJs** module loading, or you can also drop the script file right from the CDN.

### CommonJs
```bash
npm i --save adonis-websocket-client
```

### CDN
You can grab the script file from [unpkg.com](https://unpkg.com/adonis-websocket-client/dist/ws.js).

<br>
## <a name="getting-started"></a>Getting Started

Getting started is simple.

```javascript
const ws = require('adonis-websocket-client')
// or available as global when using the script file from CDN
const io = ws('http://localhost:3333')
```

### Connecting to a channel
AdonisJs comes with inbuilt support for channels and rooms. In order to communicate with the websocket server, you are required for connect to a channel first.

```javascript
const chat = io.channel('chat').connect()
chat.on('message', function (message) {
  // do something with the message
})
```

### Emitting Messages

```javascript
chat.emit('message', 'Some message from client')
```

### Join A Room

```javascript
const data = {}
chat.joinRoom('watercooler', data, function (error, joined) {
  // acknowledgement that you have joined the channel
})
```

### Leave A Room

```javascript
const data = {}
chat.leaveRoom('watercooler', data, function (error, joined) {
  // acknowledgement that you have left the channel
})
```

## Using With Vuejs
I love Vuejs to be core and here's how you are going to use it with Vuejs.

```javascript
const ws = require('adonis-websocket-client')
const wsVuePlugin = function (Vue, url, options) {
  Vue.prototype.$io = ws(url, options)
}
Vue.use(wsVuePlugin, 'http://localhost:3333', {})
```

Now you make use of the `$io` on all of your components.

### Connect To A Channel

```javascript
new Vue({
  el: '#app',
  created: function () {
    this.$io.channel('chat').connect()
  }
})
```

### Listening for events

```html
<script>
  export default {
    data: function () {
      return {
        messages: []
      }
    },
    created: function () {
      this.$io.on('message', (message) => {
        this.messages.push(message)
      })
    }
  }
</script>
```

## <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions from everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.

You can find a complete guide to be followed strictly before submitting your pull requests in the [Official Documentation](http://adonisjs.com/docs/contributing).
