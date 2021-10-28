const {StatusCodes, UserTokenType, AttributeIds, BrowseDirection} = require("node-opcua");
const connect = require("./client-connect");

module.exports = async function getReferences(nodeId, login, password) {
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

        const referenceTypes = [];
        for (let reference of browseResult.references) {
            referenceTypes.push((await session.read({
                    nodeId: reference.referenceTypeId.toString(),
                    attributeId: AttributeIds["DisplayName"]
                }
            )).value.value.text);
        }
        await session.close();
        await client.disconnect();

        const nodeURI = `/${encodeURIComponent(nodeId)}/`;
        const result = {
            "_links": {
                "self": {"href": `/api/nodes${nodeURI}references/`}
            },
            "_embedded": {}
        };

        for (let i = 0; i <= browseResult.references.length - 1; i++) {
            result._links[i + 1] = {"href": `/api/nodes${nodeURI}references/${i + 1}`};
            result._embedded[i + 1] = {
                "NodeId": browseResult.references[i].nodeId.toString(),
                "ReferenceType": referenceTypes[i],
                "isForward": browseResult.references[i].isForward
            };
        }

        return result;


    } catch
        (err) {
        throw new Error(err.message);
    }
};