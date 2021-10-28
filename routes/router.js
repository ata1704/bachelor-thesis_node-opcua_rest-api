const getNode = require('../controller/getNode');
const writeAttribute = require("../controller/writeAttribute");
const getAttribute = require("../controller/getAttribute");
const getReference = require("../controller/getReference");
const getReferences = require("../controller/getReferences");
const getHistory = require("../controller/getHistory");
const getMethods = require("../controller/getMethods");
const getMethod = require("../controller/getMethod");
const callMethod = require("../controller/callMethod");
const subscription = require("../controller/subscription");

const express = require('express');
const logger = require("morgan");
const Debug = require("debug");

/** Change rootNode if you want to use a different entry point for your OPC UA Server. */
const rootNode = "RootFolder";

/** Paths MUST always be relative path to the API root. For this implementation the API root is:
 *  {scheme}://{authority}/api
 *  Clients have to insert the API root while browsing.
 */
const paths = {
    "root": "/",
    "query": "/query",
    "entryPoint": "/nodes/" + encodeURIComponent(rootNode),
    "nodes": "/nodes/:nodeId?",
    "attributes": "/nodes/:nodeId/:attributeId",
    "documentation": "/doc",
    "references": "/nodes/:nodeId/references",
    "reference": "/nodes/:nodeId/references/:id",
    "methods": "/nodes/:nodeId/methods",
    "method": "/nodes/:nodeId/methods/:methodId",
    "subscription": "/nodes/:nodeId/subscription"
};

const router = express.Router();
if (process.env.debug) {
    Debug.enable("node-opcua-api_*");
}
const debug = Debug("node-opcua-api_rest:");
const debugWs = Debug('node-opcua-api_websocket:');
router.use(logger('dev', {stream: {write: msg => debug(msg.trimEnd())}}));


function getCredentials(authorization) {
    /** Get user information from HTTP-Header-Auth (Basic) for usage in OPC UA  */
    const basicAuth = (authorization || '').split(' ')[1] || '';
    const decodedAuth = Buffer.from(basicAuth, 'base64').toString();
    const splitIndex = decodedAuth.indexOf(':');
    return [decodedAuth.substring(0, splitIndex), decodedAuth.substring(splitIndex + 1)];
}

function sharedHTTPErrors(err) {
    switch (err) {
        case "This is not a method!":
            return {status: 404, message: "This is not a method!"};
        case "Cannot read property 'referenceTypeId' of undefined":
            return {status: 404, message: "The ReferenceId refers to a reference that does not exist for this node."};
        case "This is not an attribute.":
            return {status: 404, message: "This is not an attribute."};
        case "BadNodeIdInvalid (0x80330000)":
        case "BadNodeIdUnknown (0x80340000)":
            return {
                status: 404,
                message: "The NodeId refers to a node that does not exist in the server address space."
            };
        case "Cannot find ANONYMOUS user token policy in end point description":
            return {status: 401, message: "Access denied because of missing credentials for Basic Authentication"};
        case "BadIdentityTokenRejected (0x80210000)":
            return {status: 401, message: "Access denied because of incorrect credentials for Basic Authentication"};
        case "BadIndexRangeInvalid (0x80360000)":
        case "BadIndexRangeNoData (0x80370000)":
            return {status: 400, message: "The submitted indexRange is containing errors."};
        case "BadAttributeIdInvalid (0x80350000)":
            return {status: 404, message: "The Node doesn't provide this attribute."};
        case "BadWriteNotSupported (0x80730000)":
            return {status: 400, message: "Writing this combination of value, status and timestamps is not supported."};
        case "BadNotWritable (0x803B0000)":
            return {status: 403, message: "You're not allowed to write to this attribute."};
        case "BadOutOfRange (0x803C0000)":
            return {status: 400, message: "The value was out of range."};
        case "BadTypeMismatch (0x80740000)":
            return {
                status: 400,
                message: "The value supplied for the attribute is not of the same type as the attribute's value."
            };
        case "BadDataEncodingUnsupported (0x80390000)":
            return {status: 400, message: "The server does not support the requested data encoding for the node."};
        case "BadNotReadable (0x803a0000)":
        case "BadUserAccessDenied (0x801f0000)":
            return {status: 403, message: "The Accesslevel does not allow reading or subscribing to the Node."};
        default:
            return {status: 500, message: "Oops, something went wrong..."};
    }
}

router.get(paths.root, (req, res) => {

    res.format({
        // ToDo: Implement an HTML-Landing-Page
        // 'text/html': function () {
        //     res.send('<p>hey</p>')
        // },

        'application/json': function () {
            res.json({
                "_links": {
                    "self": {"href": "/api" + paths.root},
                    "Entry Node": {"href": "/api" + paths.entryPoint},
                    // ToDo: Implement Queries.
                    "Query": {"href": "/api" + paths.query},
                    //ToDo: Implement a documentation (e.g. Swagger).
                    "documentation": {"href": paths.documentation}
                }
            });
        },
        default: function () {
            res.status(406).send('Not Acceptable');
        }
    });
});

router.get(paths.documentation, (req, res) => {
    res.status(405).send("This has not been implemented yet.");
});

router.get(paths.nodes, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        /**
         *  OPC UA allows all unicode characters for a NodeId of type String except whitespaces
         *  and control characters.
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part3/8.32/
         *
         *  The following characters are defined as control/reserved characters:
         *  '/' | '.' | '<' | '>' | ':' | '#' | '!' | '&'
         *  @see: (https://reference.opcfoundation.org/v104/Core/docs/Part4/A.2/)
         *
         *  Express handles '?' as a query parameter, even if it could be a part of the NodeId.
         *  That's why URI encoding is used for NodeIds.
         */

        /** HistoryRead service is always called on the Node.
         *  If the parameter "start" is set without the parameter "end", the current time is used for end time,
         *  but the start time must be set.
         */
        const userCredentials = getCredentials(req.headers.authorization);

        if (req.query.end && !req.query.start)
            res.status(400).send(`You cannot set the query parameter "end" without a "start".`);
        else if (req.query.start)
            res.json(await getHistory(
                req.params.nodeId,
                req.query.start,
                req.query.end,
                userCredentials[0],
                userCredentials[1]));
        else res.json(await getNode(
                req.params.nodeId === undefined ? rootNode : req.params.nodeId,
                userCredentials[0],
                userCredentials[1]));

    } catch (err) {
        if (err.message.includes("String cannot be coerced to a nodeId"))
            res.status(404).send("The NodeId refers to a node that does not exist in the server address space.");
        else if (err.message === `"start" should be a date!` || err.message === `"end" should be a date!`)
            res.status(400).send(err.message);
        else if (err.message === "History read is not allowed for this Node.")
            res.status(403).send(err.message);
        else {
            const error = sharedHTTPErrors(err.message);
            res.status(error.status).send(error.message);
        }
    }
});

router.get(paths.subscription, ((req, res) => {
    res.status(403).send("Switch protocol to WebSocket!");
}));


router.ws(paths.subscription, (ws, req) => {
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const sub = subscription(ws, req.params.nodeId, userCredentials[0], userCredentials[1]);
        ws.on('close', function () {
            debugWs("WebSocket closed");
        });
    } catch (err) {
        debugWs(err.message);
    }
});

router.get(paths.reference, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getReference(
            req.params.nodeId,
            req.params.id,
            userCredentials[0],
            userCredentials[1]
        );

        res.json(result);

    } catch (err) {
        const error = sharedHTTPErrors(err.message);
        res.status(error.status).send(error.message);
    }
});

router.get(paths.references, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getReferences(
            req.params.nodeId,
            userCredentials[0],
            userCredentials[1]
        );
        res.json(result);

    } catch (err) {
        const error = sharedHTTPErrors(err.message);
        res.status(error.status).send(error.message);
    }
});

router.get(paths.methods, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getMethods(
            req.params.nodeId,
            userCredentials[0],
            userCredentials[1]
        );

        res.json(result);

    } catch (err) {
        const error = sharedHTTPErrors(err.message);
        res.status(error.status).send(error.message);
    }
});

router.get(paths.method, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getMethod(
            req.params.nodeId,
            req.params.methodId,
            userCredentials[0],
            userCredentials[1]
        );
        res.json(result);

    } catch (err) {
        const error = sharedHTTPErrors(err.message);
        res.status(error.status).send(error.message);
    }
});

router.post(paths.method, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await callMethod(
            req.params.methodId,
            req.params.nodeId,
            req.body,
            userCredentials[0],
            userCredentials[1]
        );
        res.json(result);

    } catch (err) {
        if (err.message.includes("Input Error:"))
            res.status(422).send(err.message);
        else {
            const error = sharedHTTPErrors(err.message);
            res.status(error.status).send(error.message);
        }
    }
});

router.get(paths.attributes, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getAttribute(
            req.params.nodeId,
            req.params.attributeId,
            userCredentials[0],
            userCredentials[1]
        );

        res.json(result);

    } catch (err) {
        const error = sharedHTTPErrors(err.message);
        res.status(error.status).send(error.message);
    }
});

router.get(paths.query, async (req, res) => {
    try {
        res.status(405).send("This has not been implemented yet.");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post(paths.query, async (req, res) => {
    try {
        res.status(405).send("This has not been implemented yet.");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.put(paths.attributes, async (req, res) => {
    if (!req.accepts('application/hal+json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);

        await writeAttribute(
            req.params.nodeId,
            req.params.attributeId,
            req.body,
            userCredentials[0],
            userCredentials[1]
        );
        // The body is send for clients like Postman, that need a message body for 204.
        res.status(204).send("");
    } catch (err) {
        if (err.message === "BadUserAccessDenied (0x801F0000)")
            res.status(403).send("You're not allowed to write to this attribute.");
        else if (err.methodId === err.message.includes("LocaleNotSupported"))
            res.status(400).send("The locale in the requested write operation is not supported.");
        else {
            const error = sharedHTTPErrors(err.message);
            res.status(error.status).send(error.message);
        }
    }
});

module.exports = router;