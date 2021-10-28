const {StatusCodes, UserTokenType, AttributeIds, NodeClass} = require("node-opcua");
const connect = require("./client-connect");
const {LocalText} = require("./AttributeDetails");

module.exports = async function getMethods(nodeId, login, password) {
    try {
        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect();
        const session = await client.createSession(userIdentity);
        /** requestedMaxReferencesPerNode set to '0' means there's no maximum of returned references. */
        session.requestedMaxReferencesPerNode = 0;

        const browseResult = await session.browse(nodeId);
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        const nodeURI = `/${encodeURIComponent(nodeId)}/`;
        const result = {
            "_links": {
                "self": {"href": `/api/nodes${nodeURI}methods/`}
            },
            "_embedded": {}
        };

        for (const reference of browseResult.references) {
            if (reference.nodeClass === NodeClass.Method && reference.isForward === true) {
                const description = await session.read({
                    nodeId: reference.nodeId.toString(),
                    attributeId: AttributeIds["Description"]
                });
                result._links[reference.nodeId.toString()] =
                    {"href": `/api/nodes${nodeURI}methods/${encodeURIComponent(reference.nodeId.toString())}`};
                result._embedded[reference.nodeId.toString()] = {
                    "NodeId": reference.nodeId.toString(),
                    "DisplayName": LocalText(reference.displayName),
                    "Description": LocalText(description.value.value)
                };
            }
        }
        await session.close();
        await client.disconnect();

        return result;

    } catch
        (err) {
        throw new Error(err.message);
    }
};