const {StatusCodes, UserTokenType, AttributeIds, BrowseDirection, NodeClass} = require("node-opcua");
const connect = require("./client-connect");

module.exports = async function getReference(nodeId, referenceId, login, password, serverId) {
    try {

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect(serverId);
        const session = await client.createSession(userIdentity);
        /** requestedMaxReferencesPerNode set to '0' means there's no maximum of returned references. */
        session.requestedMaxReferencesPerNode = 0;

        const browseDescription = {
            browseDirection: BrowseDirection.Both,
            includeSubtype: false,
            nodeClassMask: 0,
            referenceTypeId: 0,
            resultMask: 0b111111,
            nodeId: nodeId
        };

        const browseResult = await session.browse(browseDescription);
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        const referenceType = (await session.read({
                nodeId: browseResult.references[referenceId - 1].referenceTypeId.toString(),
                attributeId: AttributeIds["DisplayName"]
            }
        )).value.value.text;

        await session.close();
        await client.disconnect();

        const nodeURI = `/${encodeURIComponent(nodeId)}/`;

        return {
            "_links": {
                "self": {"href": `/api/${serverId}/nodes${nodeURI}references/${referenceId}`},
                "Node": {"href": `/api/${serverId}/nodes/${encodeURIComponent(browseResult.references[referenceId - 1].nodeId.toString())}`},
                "ReferenceType": {"href": `/api/${serverId}/nodes/${encodeURIComponent(browseResult.references[referenceId - 1].referenceTypeId.toString())}`},
            },
            "_embedded": {
                "Node": {
                    "NodeId": browseResult.references[referenceId - 1].nodeId.toString(),
                    "DisplayName": browseResult.references[referenceId - 1].displayName.text.toString(),
                    "NodeClass": NodeClass[browseResult.references[referenceId - 1].nodeClass]
                },
                "ReferenceType": {
                    "NodeId": browseResult.references[referenceId - 1].referenceTypeId.toString(),
                    "DisplayName": referenceType
                }
            },
            "isForward": browseResult.references[referenceId - 1].isForward
        };

    } catch
        (err) {
        throw new Error(err.message);
    }
};