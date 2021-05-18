import browse from '../controller/browse.js';
import read from '../controller/read.js';

import express from 'express';

const router = express.Router();

router.get('/browse/*', ((req, res) => {
    (async () => {
        try {
            /*
                '?' is interpreted as a query parameter.
                OPC UA allows all unicode characters for a NodeID of type String except whitespaces
                and control characters. (https://reference.opcfoundation.org/v104/Core/docs/Part3/8.32/).
                The following characters are defined as control/reserved characters:
                    '/' | '.' | '<' | '>' | ':' | '#' | '!' | '&' (https://reference.opcfoundation.org/v104/Core/docs/Part4/A.2/)
                That's why a question mark is actually an allowed characters for a NodeID of type String.
                However, in REST question marks are used to highlight query parameters. To comply with that common
                practise NodeIDs containing question marks are not supported in this api.
            */
            const browseResult = await browse(req.params[0], req.query['max-references']);

            /*
                Returns the following HTTP status code if the browseResult contains
                the element 'statusCode' which means that that a invalid starting node was used:
                - HTTP Status Code 404 Not Found: The requested resource could not be found.
            */
            if (!browseResult.hasOwnProperty('statusCode'))
                res.status(404).json(browseResult);
            else
                res.json(browseResult);
        } catch (err) {
            /*
                Every other error beside a invalid starting node, result in the following HTTP status code:
                500 Internal Server Error
            */
            res.status(500).send(err.message);
        }
    })();
}))

router.get('/read/*', ((req, res) => {
    (async () => {
            try {
                const readResponse = await read(
                    req.params[0],
                    req.query['attributeId'],
                    req.query['indexRange'],
                    req.query['dataEncoding'],
                    req.query['maxAge']);
                if (!readResponse.hasOwnProperty('statusCode'))
                    res.status(404).json(readResponse);
                else
                    res.json(readResponse);

            } catch (err) {
                res.status(500).send(err.message);
            }
        }
    )();
}))

export default router;



