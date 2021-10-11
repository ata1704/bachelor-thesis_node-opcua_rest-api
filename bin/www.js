#!/usr/bin/env node
/**
 *  To specify the URI for the OPC UA server set the environment variable "serverURL" with the URI as the value.
 *  Environment variable "debug" must be set for debug messages on the console.
 *      - Set the variable to "local" if the API and the OPC UA server running on the same machine (localhost).
 *      - Set the variable to "home" to use the OPC UA server of Hochschule Merseburg.
 */

/**
 * Module dependencies.
 */

const app = require('../app');
const Debug = require('debug');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');


const subscription = require("../controller/subscription");
const socketCollection = require("./socketCollection");

if(process.env.debug){
    Debug.enable("node-opcua-api_*");
}
const debug = Debug("node-opcua-api_rest:");
const debugWs = Debug('node-opcua-api_websocket');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Setup of Websocket and http-Server.
 */

const server = http.createServer(app);
const wss = new WebSocket.Server({server: server, path: '/api/subscription'});


/**
 * Handle WebSocket connections.
 */

wss.on('connection', function connection(ws) {
    const id = uuidv4();
    debugWs(`WebSocketMessage: New Client with Id ${id} is connected...`);

    // To handle multiple client connections and use them in the module "subscription.js" the socket connections
    // are pushed to an module containing an array of sockets.
    socketCollection.push({
        id: id,
        socket: ws,
    });


    ws.on('message', (message) => {
        try {
            // The message is received as a string and that's why json parsing is necessary.
            subscription(id, JSON.parse(message));
        } catch (e) {
            ws.send("Not a JSON file");
        }
    });

    ws.on('close', () => {
        debugWs(`WebSocketMessage: Client with Id ${id} is disconnected...`);
        // Delete the socket from the socketCollection.
        for (let i = 0; i < socketCollection.length; i++)
            if (socketCollection[i].id === id) {
                socketCollection.splice(i, 1);
                break;
            }
    })
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

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

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
