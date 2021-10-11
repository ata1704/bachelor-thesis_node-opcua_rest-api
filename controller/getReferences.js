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

        /** Right now it is not possible to retrieve all references. Only references that can be obtained by using the
         *  browseDirection "FORWARD_0" are returned. That's because there is a bug in NodeOPCUA that prevents from
         *  using other options for the browseDirection (as of 10/10/2021).
         *  @see: https://github.com/node-opcua/node-opcua/issues/1065
         *
         *  If this bug is fixed in future releases the following statement should be used instead of the nodeId:
         *  { nodeId: nodeId, browseDirection: BrowseDirection.Both }
         */

        const browseResult = await session.browse(nodeId);
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        const referenceTypes = [];
        for (let reference of browseResult.references) {
            referenceTypes.push((await session.read({
                nodeId: reference.referenceTypeId.toString(),
                attributeId: AttributeIds["DisplayName"]}
            )).value.value.text)
        }
        await session.close();
        await client.disconnect();

        const nodeURI = `/${encodeURIComponent(nodeId)}/`
        const result = {
            "_links": {
                "self" : {"href": `/nodes${nodeURI}references/`}
            },
            "_embedded": {}
        };

        for(let i=0; i<=browseResult.references.length-1; i++){
            result._links[i+1] = {"href": `/nodes${nodeURI}references/${i+1}}`}
            result._embedded[i+1] = {
                "NodeId": browseResult.references[i].nodeId.toString(),
                "ReferenceType": referenceTypes[i]
            }
        }

        return result;


    } catch
        (err) {
        throw new Error(err.message);
    }
}