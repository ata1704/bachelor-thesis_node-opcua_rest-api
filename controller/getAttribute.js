const {
    AttributeIds,
    NodeClass,
    StatusCodes,
    UserTokenType,
    getStatusCodeFromCode
} = require("node-opcua");
const connect = require("./client-connect");
const {
    ValueRank,
    DataTypeIdsToString,
    EventNotifier,
    AccessLevel,
    MinimumSamplingInterval,
    AccessRestrictions,
    AttributeWriteMask,
    LocalText
} = require("./AttributeDetails");


module.exports = async function getAttribute(nodeId, attributeId, login, password) {
    try {
        function attributes(attribute, dataValue) {
            if (!dataValue || !dataValue.value || !dataValue.value.hasOwnProperty("value")) {
                return "<null>";
            }
            switch (AttributeIds[attribute]) {
                case AttributeIds.Description:
                case AttributeIds.DisplayName:
                    return LocalText(dataValue.value.value);
                case AttributeIds.WriteMask:
                case AttributeIds.UserWriteMask:
                    return AttributeWriteMask(dataValue.value.value);
                case AttributeIds.ValueRank:
                    return ValueRank(dataValue.value.value);
                case AttributeIds.DataType:
                    return DataTypeIdsToString[dataValue.value.value.value];
                case AttributeIds.NodeClass:
                    return NodeClass[dataValue.value.value];
                case AttributeIds.EventNotifier:
                    return EventNotifier(dataValue.value.value);
                case AttributeIds.MinimumSamplingInterval:
                    return MinimumSamplingInterval(dataValue.value.value);
                case AttributeIds.UserAccessLevel:
                case AttributeIds.AccessLevel:
                case AttributeIds.AccessLevelEx:
                    return AccessLevel(dataValue.value.value);
                case AttributeIds.AccessRestrictions:
                    return AccessRestrictions(dataValue.value.value);
                default:
                    return null;
            }
        }

        /** Checking if the attribute is writable. Only the UserWriteMask is used, because
         *  the UserWriteMask attribute can only further restrict the WriteMask attribute.
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part3/5.2.8/
         */
        async function writableCheck(currentSession, attributeName, node) {
            if (attributeName === "Value") {
                const res = await currentSession.read({
                    nodeId: node,
                    attributeId: AttributeIds["UserAccessLevel"]
                });
                return AccessLevel(res.value.value).includes("CurrentWrite");
            } else {
                const res = await currentSession.read({
                    nodeId: node,
                    attributeId: AttributeIds["UserWriteMask"]
                });
                return AttributeWriteMask(res.value.value).includes(attributeName);
            }
        }

        /** Validation of the URI path element for the attribute.
         *  It's also possible to use the identifiers of the attributes in the URI.
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part6/A.1/
         */
        if (!isNaN(attributeId)) attributeId = AttributeIds[attributeId];
        if (AttributeIds[attributeId] === undefined)
            throw new Error("This is not an attribute.");

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };

        const client = await connect();
        const session = await client.createSession(userIdentity);

        const readResult = await session.read({
            nodeId: nodeId,
            attributeId: AttributeIds[attributeId]
        });
        /** Checking if the attribute is supported by the specified node: */
        if (readResult.statusCode !== StatusCodes.Good) {
            await client.disconnect();
            throw new Error(getStatusCodeFromCode(readResult.statusCode.value));
        }

        delete readResult.statusCode;

        /** Providing additional/prettier data: */
        const additionalData = attributes(attributeId, readResult);
        let result = readResult.toJSON();
        if (additionalData)
            result[attributeId] = additionalData;

        const writable = await writableCheck(session, attributeId, nodeId);

        await session.close();
        await client.disconnect();

        result = {
            "_links": {
                "self": {"href": `/api/nodes/${encodeURIComponent(nodeId)}/${attributeId}`}
            }, ...result
        };
        if (writable) result._links.update = {
            "href": "/api/nodes/" + encodeURIComponent(nodeId) + "/" + attributeId,
            "method": "PUT"
        };

        /** Add the Timestamps to a "time" object:*/
        result.time = {};
        Object.keys(result).forEach(key => {
            if (key.includes("Timestamp") || key.includes("Picoseconds")) {
                result.time[key] = result[key];
                delete result[key];
            }
        });

        return result;
    } catch
        (err) {
        throw new Error(err.message);
    }
};