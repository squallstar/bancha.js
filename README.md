# Bancha.js

This is a port of [Bancha CMS](https://github.com/squallstar/bancha) for **Node.js**. Currently under heavy development, not for use yet.

# Basic usage

```
npm install bancha --save
```

```javascript
var bancha = require('bancha');

bancha().start(function () {
  console.log('Yipee!');
});
```