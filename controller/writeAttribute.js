const {StatusCodes, AttributeIds, UserTokenType, coerceNodeId, DataTypeIds, Variant} = require("node-opcua");
const connect = require("./client-connect");

/**
 *  Example payload (note that not all possible field have been implemented yet):
 *  {
 *      indexRange: NumericRange (https://node-opcua.github.io/api_doc/2.32.0/classes/node_opcua.numericrange.html)
 *
 *      value: [{
 *          value: {
 *              arrayType (optional):   string | Scalar | Array | Matrix
 *              dataType:               string | Null | Boolean | SByte | Byte | Int16 | UInt16 | Int32 | UInt32 |
 *                                      Int64 | UInt64 | Float | Double | String | DateTime | Guid | ByteString |
 *                                      XmlElement | NodeId | ExpandedNodeId | StatusCode | QualifiedName | LocalizedText |
 *                                      ExtensionObject | DataValue | Variant | DiagnosticInfo
 *              value:                  any
 *              },
 *          statusCode:         StatusCode
 *          sourceTimestamp:    DateTime
 *          sourcePicoSeconds:  number
 *          serverTimestamp:    DateTime
 *          serverPicoSeconds:  number
 *      },{...}]
 *  }
 */

module.exports = async function writeAttribute(nodeId, attributeId, payload, login, password, serverId) {
    try {
        const userIdentity = (login || password) === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };

        const client = await connect(serverId);
        const session = await client.createSession(userIdentity);

        // const writeValueOptions = {
        //     nodeId: nodeId,
        //     attributeId: (isNaN(attributeId)) ? AttributeIds[attributeId] : attributeId,
        //     value: [{
        //         value: {
        //             dataType: isNaN(payload.value[0].dataType) ? DataTypeIds[payload.value[0].dataType] : payload.value[0].dataType,
        //             value: payload.value[0].value
        //         }
        //     }]
        // };

        const writeValueOptions = {
            nodeId: nodeId,
            attributeId: (isNaN(attributeId)) ? AttributeIds[attributeId] : attributeId,
            value: {
                value: {
                    dataType: isNaN(payload.value[0].value.dataType) ? DataTypeIds[payload.value[0].value.dataType] : payload.value[0].value.dataType,
                    value: payload.value[0].value.value
                }
            }
        };

        // ToDo: conditionally add: https://node-opcua.github.io/api_doc/2.32.0/classes/node_opcua.numericrange.html
        // writeValueOptions.indexRange =
        // ToDo: conditionally add: https://node-opcua.github.io/api_doc/2.32.0/interfaces/node_opcua.datavalueoptions.html
        // writeValueOptions.value.serverPicoseconds =
        // writeValueOptions.value.sourcePicoseconds =
        // writeValueOptions.value.serverTimestamp =
        // writeValueOptions.value.sourceTimestamp =
        // writeValueOptions.value.statusCode =
        // ToDo: conditionally add: https://node-opcua.github.io/api_doc/2.32.0/interfaces/node_opcua.variantoptions.html
        // writeValueOptions.value.value.dimensions =
        // writeValueOptions.value.value.arrayType =

        const response = await session.write(writeValueOptions);

        await session.close();
        await client.disconnect();

        /** The response only consists of a Statuscode. */
        if (response !== StatusCodes.Good)
            throw new Error(response.toString());
        return response.toString();
    } catch (err) {
        throw new Error(err.message);
    }
};