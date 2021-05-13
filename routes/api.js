import * as opcClient from '../controller/opc-client.js';

import express from 'express';
const router = express.Router();

router.get('/browse/*', ((req, res) => {
    (async () => {
        try {
            console.log(req.params[0])
            const browseResult = await opcClient.browse(req.params[0]);
            // Prüfung auf property "statusCode", was nicht vorhanden ist, wenn ich lediglich
            // den Status zurücksende.
            if(!browseResult.hasOwnProperty('statusCode'))
                  res.status(404).json(browseResult);
            else res.json(browseResult);
        }
        catch (err){
            res.status(500).send(err.message);
        }
    })();
}))

export default router;



