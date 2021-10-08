import getNode from '../controller/getNode.js';
import write from "../controller/write.js";
import extractNamespaceDataTypeRouter from "./api.namespaceDataType.js";
import getAttribute from "../controller/getAttribute.js";
import getReference from "../controller/getReference.js";
import getReferences from "../controller/getReferences.js";
import getHistory from "../controller/getHistory.js";


import express from 'express';
import logger from "morgan";
import Debug from "debug";
import {nodesets} from "node-opcua";

/** Change rootNode if you want to use a different entry point for your OPC UA Server. */
const rootNode = "RootFolder"

/** Paths MUST always be relative path to the API root. For this implementation the API root is:
 *  {scheme}://{authority}/api
 *  Clients have to insert the API root while browsing.
 */
const paths = {
    "root": "/",
    "query": "/query",
    "entryPoint": "/nodes/"+encodeURIComponent(rootNode),
    "nodes": "/nodes/:nodeId?",
    "attributes": "/nodes/:nodeId/:attributeId",
    "documentation": "/doc",
    "references": "/nodes/:nodeId/references",
    "reference": "/nodes/:nodeId/references/:id"
}

const router = express.Router();
router.use('/namespace-data-type', extractNamespaceDataTypeRouter);
if (process.env.debug) {
    Debug.enable("node-opcua-api_*");
}
const debug = Debug("node-opcua-api_rest:");
router.use(logger('dev', {stream: {write: msg => debug(msg.trimEnd())}}));


function getCredentials(authorization) {
    /** Get user information from HTTP-Header-Auth (Basic) for usage in OPC UA  */
    const basicAuth = (authorization || '').split(' ')[1] || '';
    const decodedAuth = Buffer.from(basicAuth, 'base64').toString();
    const splitIndex = decodedAuth.indexOf(':');
    return [decodedAuth.substring(0, splitIndex), decodedAuth.substring(splitIndex + 1)];
}

// BadNotReadable (0x803a0000)
// BadNotWritable (0x803b0000)
// BadUserAccessDenied (0x801f0000)
router.get(paths.root, (req, res) => {

    res.format({
        // ToDo: Implement an HTML-Landing-Page
        // 'text/html': function () {
        //     res.send('<p>hey</p>')
        // },

        'application/json': function () {
            res.json({
                "_links": {
                    "self": {"href": paths.root},
                    "RootNode": {"href": paths.entryPoint},
                    "query": {"href": paths.query},
                    // ToDO: Implement a documentation (e.g. Swagger).
                    //"documentation": {"href": paths.documentation}
                }
            })
        },
        default: function () {
            res.status(406).send('Not Acceptable')
        }
    })
});

router.get(paths.nodes, async (req, res) => {
    if(!req.accepts('application/json')) res.status(406).send('Not Acceptable');
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
         *  If the parameter start time is set without parameter end time, the current time is used for end time,
         *  but start time must be set.
         */
        const userCredentials = getCredentials(req.headers.authorization);

        if(req.query.end && !req.query.start)
            res.status(400).send("You cannot set the query parameter end time without a start time.");
        else if(req.query.start)
            res.json(await getHistory(
                req.params.nodeId,
                req.query.start,
                req.query.end,
                userCredentials[0],
                userCredentials[1]));
        else res.json(await getNode(
            req.params.nodeId === undefined ? rootNode : decodeURIComponent(req.params.nodeId),
            userCredentials[0],
            userCredentials[1]));

    } catch (err) {
        if (err.message.includes("String cannot be coerced to a nodeId"))
            res.status(404).send("The NodeId refers to a node that does not exist in the server address space.");
        else {
            switch (err.message) {
                case "BadNodeIdUnknown (0x80340000)":
                    res.status(404).send("The NodeId refers to a node that does not exist in the server address space.");
                    break;
                case "Cannot find ANONYMOUS user token policy in end point description":
                    res.status(401).send("Access denied because of missing credentials for Basic Authentication");
                    break;
                case "BadIdentityTokenRejected (0x80210000)":
                    res.status(401).send("Access denied because of incorrect credentials for Basic Authentication");
                    break;
                case "BadNotReadable (0x803a0000)":
                    res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                    break;
                case "BadUserAccessDenied (0x801f0000)":
                    res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                    break;
                default:
                    res.status(500).send("Oops, something went wrong...");
                    break;
            }
        }
    }
});

router.get(paths.reference, async (req, res) => {
    if(!req.accepts('application/json')) res.status(406).send('Not Acceptable');
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
        switch (err.message) {
            case "Cannot read property 'referenceTypeId' of undefined":
                res.status(404).send("The ReferenceId refers to a reference that does not exist for this node.");
                break;
            case "BadNodeIdUnknown (0x80340000)":
                res.status(404).send("The NodeId refers to a node that does not exist in the server address space.");
                break;
            case "Cannot find ANONYMOUS user token policy in end point description":
                res.status(401).send("Access denied because of missing credentials for Basic Authentication");
                break;
            case "BadIdentityTokenRejected (0x80210000)":
                res.status(401).send("Access denied because of incorrect credentials for Basic Authentication");
                break;
            case "BadNotReadable (0x803a0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            case "BadUserAccessDenied (0x801f0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            default:
                res.status(500).send("Oops, something went wrong...");
                break;
        }
    }
});

router.get(paths.references, async (req, res) => {
    if(!req.accepts('application/json')) res.status(406).send('Not Acceptable');
    try {
        const userCredentials = getCredentials(req.headers.authorization);
        const result = await getReferences(
            req.params.nodeId,
            userCredentials[0],
            userCredentials[1]
        );

        res.json(result);

    } catch (err) {
        switch (err.message) {
            case "BadNodeIdUnknown (0x80340000)":
                res.status(404).send("The NodeId refers to a node that does not exist in the server address space.");
                break;
            case "Cannot find ANONYMOUS user token policy in end point description":
                res.status(401).send("Access denied because of missing credentials for Basic Authentication");
                break;
            case "BadIdentityTokenRejected (0x80210000)":
                res.status(401).send("Access denied because of incorrect credentials for Basic Authentication");
                break;
            case "BadNotReadable (0x803a0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            case "BadUserAccessDenied (0x801f0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            default:
                res.status(500).send("Oops, something went wrong...");
                break;
        }
    }
});

router.get(paths.attributes, async (req, res) => {
    if(!req.accepts('application/json')) res.status(406).send('Not Acceptable');
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
        switch (err.message) {
            case "BadAttributeIdInvalid (0x80350000)":
                res.status(404).send("The Node doesn't provide this attribute.");
                break;
            case "This is not an attribute.":
                res.status(404).send("This is not an attribute.");
                break;
            case "Cannot find ANONYMOUS user token policy in end point description":
                res.status(401).send("Access denied because of missing credentials for Basic Authentication");
                break;
            case "BadIdentityTokenRejected (0x80210000)":
                res.status(401).send("Access denied because of incorrect credentials for Basic Authentication");
                break;
            case "BadNotReadable (0x803a0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            case "BadUserAccessDenied (0x801f0000)":
                res.status(403).send("The access level does not allow reading or subscribing to the Node.");
                break;
            default:
                res.status(500).send("Oops, something went wrong...");
                break;
        }
    }
});


// router.post('/query/*', ((req, res) => {
//     (async () => {
//         try {
//             res.json({"This is a test": "Success"});
//         } catch (err) {
//             res.status(500).send(err.message);
//         }
//     })();
// }))

router.post('/write/*', ((req, res) => {
    (async () => {
        try {
            // Get user information from HTTP-Header-Auth (Basic) for usage in OPC UA
            const basicAuth = (req.headers.authorization || '').split(' ')[1] || ''
            const decodedAuth = Buffer.from(basicAuth, 'base64').toString()
            const splitIndex = decodedAuth.indexOf(':')
            const login = decodedAuth.substring(0, splitIndex);
            const password = decodedAuth.substring(splitIndex + 1);

            const callResponse = await write(
                req.params[0], //nodeId
                req.body.attributeId,
                req.body.value,
                login,
                password
            );
            if (!callResponse.hasOwnProperty('statusCode'))
                res.status(400).json(callResponse);
            else
                res.json(callResponse);
        } catch (err) {
            res.status(500).send(err.message);
        }
    })();
}))

export default router;



