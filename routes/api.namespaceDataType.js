import * as namespaceDataType from "../controller/namespaceDataType.js";

import express from 'express';
const router = express.Router();

router.get('/', ((req, res) => {
    (async () => {
            try {
                res.json(await namespaceDataType.extractNamespaceDataType());
            } catch (err) {
                res.status(500).send(err.message);
            }
        }
    )();
}))

router.get('/data-type-factory/:id', ((req, res) => {
    (async () => {
            try {
                res.json(await namespaceDataType.getDataTypeFactory(req.params.id));
            } catch (err) {
                res.status(500).send(err.message);
            }
        }
    )();
}))

router.get('/ExtensionObjectConstructorFromBinaryEncoding/*', ((req, res) => {
    (async () => {
            try {
                res.json(await namespaceDataType.getExtensionObjectConstructorFromBinaryEncoding(req.params[0]));
            } catch (err) {
                res.status(500).send(err.message);
            }
        }
    )();
}))

export default router;