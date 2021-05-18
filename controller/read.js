import {StatusCodes, AttributeIds} from "node-opcua";
import Connect from "./client-connect.js";

export default async function read(nodeToBrowse, attributeId, indexRange = null, dataEncoding = null, maxAge = null) {
    try {
        const client = await Connect();
        const session = await client.createSession();

        /*-- Attribute Ids --------------

            If the attribute id is not set or not valid the default attribute 'value' is returned.
            All attribute ids with the corresponding identifiers can be found in OPC 10000-4 Unified Architecture Part 6:
            https://reference.opcfoundation.org/v104/Core/docs/Part6/A.1/
        */

        if (isNaN(attributeId)) attributeId = AttributeIds[attributeId]; // Returns the identifier for given the attribute.
        else parseInt(attributeId);

        const response = await session.read(
            {
                nodeId: nodeToBrowse,
                attributeId: attributeId,
                indexRange: indexRange,
                dataEncoding: dataEncoding
            }, maxAge
        );

        await session.close();
        await client.disconnect();

        //  toJSONFULL() returns a more detailed OPC UA status code, including the name and description.
        if (response.statusCode !== StatusCodes.Good)
            return response.statusCode.toJSONFull();
        return response.toJSON();

    } catch (err) {
        throw new Error(err.message);
    }
}