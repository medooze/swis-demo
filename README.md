# swis demo

Three components:

* **widget:** A JS library, pluggable in any site, that displays a button to run a *swis* observer.
* **reflector:** A web application that runs the *swis* reflector module.
* **server:** A Node.js signaling server.


## Usage

### Widget

Place it in any site by adding a script tag:

```html
<script src='https://dev.ef2f.com/html/swis/swis-widget.js'></script>
```

Or in the browser console:

```js
var src = 'https://dev.ef2f.com/html/swis/swis-widget.js';
var script = document.createElement('script');

script.type = 'text/javascript';
script.src = src;
document.body.appendChild(script);
```


### Reflector

Run the application:

```bash
$ cd reflector
$ npm i
$ npm start
```


## Advanced

All the components can be executed locally.

*TBD*
