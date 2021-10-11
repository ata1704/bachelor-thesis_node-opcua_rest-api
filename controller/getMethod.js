const {StatusCodes, UserTokenType, BrowseDirection, AttributeIds, DataTypeIds, coerceNodeId, NodeClass} = require("node-opcua");
const connect = require("./client-connect");
const getPossibleAttributes = require("./getPossibleAttributes");
const {DataTypeIdsToString, arrayType} = require("./AttributeDetails");

module.exports = async function getMethod(nodeId, methodId, login, password) {
    try {
        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };

        const client = await connect();
        const session = await client.createSession(userIdentity);

        /** Verifying if the methodId references a method: */
        if((await session.read({nodeId: methodId, attributeId: AttributeIds["NodeClass"]})).value.value !== NodeClass.Method)
            throw new Error("This is not a method!")

        /** requestedMaxReferencesPerNode set to '0' means there's no maximum of returned references. */
        session.requestedMaxReferencesPerNode = 0;

        const browseResult = await session.browse(methodId);
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        const attributes = await getPossibleAttributes(methodId, session);

        const nodeURI = `/${encodeURIComponent(nodeId)}/`
        const methodURI = `/${encodeURIComponent(methodId)}`
        const result = {
            "_links": {
                "self" : {"href": "/nodes/"+nodeURI+"methods"+methodURI},
            }, "_embedded": {}
        };

        /** In the documentation it is stated, that some values stand for scalar, an array of a
         *  specific or any dimension at the same time (e.g. Any (−2): scalar or an array with any number of dimensions)
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part3/5.6.2/
         *  If that's the case, the superior type is used, because NodeOPCUA works with only three
         *  array types, when it comes to generating Variants as input arguments.
         */

        /** POST method is shown if the method is executable. */
        if(attributes.executable)
            result._links.call = {"href": "/nodes/"+nodeURI+"methods"+methodURI, "method": "POST"}

        /** Getting the input and output attributes together with there values: */
        for (const reference of browseResult.references) {
            if(reference.referenceTypeId.toString() === "ns=0;i=46") {
                result._links[reference.displayName.text] =
                    {"href": "/nodes/" + encodeURIComponent(reference.nodeId.toString())}
                result._embedded[reference.displayName.text]={
                    "Values": (await session.read({nodeId: reference.nodeId, attributeId: AttributeIds["Value"]})).toJSON().value.value,
                }
            }
        }

        /** Cleaning up the embedded view so that it fits the scheme used for the POST method (calling the method). */
        Object.keys(result._embedded).forEach( key => {
            result._embedded[key].Values.forEach(value => {
                if (value.dataType) {
                    value.dataType = DataTypeIdsToString[coerceNodeId(value.dataType).value]
                }
                if (value.valueRank) {
                    value.arrayType = arrayType(value.valueRank)
                }
                delete value.arrayDimensions;
                delete value.valueRank
            })
        })

        await session.close();
        await client.disconnect();

        Object.keys(attributes.embeddedAttributes).forEach(attribute =>{
            result[attribute] = attributes.embeddedAttributes[attribute]
        });
        result.executable = attributes.executable;

        return result;

    } catch
        (err) {
        throw new Error(err.message);
    }
}