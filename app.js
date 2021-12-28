/**
 *  OPC UA Server address:
 *  To specify the URI for the OPC UA server set the environment variable "opcuaServerUrl" with the URI as the value.
 *  If serverURL is set to "home" the URI "opc.tcp://149.205.102.44:4840" is used.
 *
 *  Debugging:
 *  Environment variable "debug" must be set for debug messages on the console.
 *
 *  On localhost:
 *  Set the environment variable "opcuaLocal" to any value, if you're using the API and the OPC UA Server on the same device (localhost).
 *  This sets "endpoint_must_exist" to "false" which is necessary if a client and server are running on the same machine.
 *
 *  If the environment variable PORT is not set to a different port, 3000 will be used as the port of the API.
 */


/** Module dependencies. */
const Debug = require('debug');
const express = require('express');
const cors = require('cors');
const app = express();
// Do not delete the following line of code and it should always be declared before the assignment of any router declarations!
const expressWs = require('express-ws')(app);
app.use(function (req, res, next) {
    res.header("Content-Type", 'application/hal+json');
    next();
});

/** "Global" Variable for the servers. **/
let Server = [];
const fs = require('fs');
try {
    fs.writeFileSync(".servers.json", "", {flag: 'wx', encoding: "utf-8"});
    const data = fs.readFileSync(".servers.json", 'utf8');
    if (data !== "") {
        Server = JSON.parse(data);
    }
} catch (err) {
    if(err.code !== 'EEXIST')
        console.error(err);
}
module.exports.Server = Server;

/** Router: */
const router = require('./routes/router');
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use('/api', router);

/** Error Handler for failed JSON parsing */
app.use(function (err, req, res, next) {
    if (err.type === "entity.parse.failed")
        res.status(400).send("There's a syntax error in your transmitted JSON.");
    else
        next(err);
});


/** Set up Debug for debugging */
if (process.env.debug) {
    Debug.enable("node-opcua-api_*");
}
const debug = Debug("node-opcua-api_rest:");
const debugWs = Debug('node-opcua-api_websocket:');

/**
 *  Logging express-ws connections.
 */
expressWs.getWss().on('connection', function (ws) {
    debugWs("WebSocket opened");
});

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');

const server = app.listen(port, onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + server.address().port;
    debug('Listening on ' + bind);
}

module.exports.app = app;