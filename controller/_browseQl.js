import { StatusCodes } from "node-opcua";
import {connect} from "./client-connect.js";

export default async function browseQl(nodeToBrowse, maxRef = 0) {
    try {
        const session = await client.createSession();

        /**
         *   Maximum of references set to '0' corresponds to no limitations of the 'requestedMax ReferencesPerNode':
         *   https://reference.opcfoundation.org/v104/Core/docs/Part4/5.8.2/
        */
        session.requestedMaxReferencesPerNode = maxRef;

        const client = await connect();
        const browseResult = await session.browse(nodeToBrowse);

        /**
         *  If the server has set a limit for 'requestedMax ReferencesPerNode' we need to obtain the missing
         *  references. This is done with the method 'browseNext'. To use 'browseNext' we need an existing
         *  'ContinuationPoint' (https://reference.opcfoundation.org/v104/Core/docs/Part4/7.6/).
         *  The problem is that the ContinuationPoint is released if the session gets closed.
         *  To solve this problem we automatically start additionally browseNext methods
         *  within this method to obtain the missing references.
         *  Like the server can set 'requestedMax ReferencesPerNode' the client is able to do the same.
         *  That's why the variable 'maxRef' of the client is taken in consideration.
        */

        let browseNext = undefined;
        if (browseResult.continuationPoint && maxRef > browseResult.references.length) {
            let continuationPoint = browseResult.continuationPoint;
            do {
                browseNext = await session.browseNext(continuationPoint, false);
                browseResult.references = [...browseResult.references, ...browseNext.references];
                continuationPoint = browseNext.continuationPoint;
            } while (browseNext.continuationPoint && maxRef > browseResult.references.length)
            browseNext.references = browseNext.references.slice(0, maxRef);
        }
        delete browseResult.continuationPoint; // The continuationPoint is obsolete.

        await session.close();
        await client.disconnect();

        browseResult.nodeId = nodeToBrowse; // Adding the nodeId to the object, due to the logic of GraphQL.

        return browseResult;

    } catch
        (err) {
        throw new Error(err.message);
    }
}