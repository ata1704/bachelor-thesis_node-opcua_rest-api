import {
    AttributeIds,
    NodeClass,
    StatusCodes,
    UserTokenType,
    getStatusCodeFromCode,
    DataTypeIds
} from "node-opcua";
import {connect} from "./client-connect.js";

export default async function getAttribute(nodeId, attributeId, login, password) {
    try {
        function ValueRank(val) {
            if(val > 1) return `Array (${val} dimensions)`;
            else if(val === 1) return `Array (1 dimension)`;
            else if(val === 0) return `Array (>=1 dimensions)`;
            else if(val === -1) return `Scalar`;
            else if(val === -2) return `Scalar or Array (>=1 dimensions)`;
            else if(val === -3) return `Scalar or Array (1 dimension)`;
            else return "";
        }

        const DataTypeIdsToString = invert(DataTypeIds);
        function invert(o)  {
            const r = {};
            for (const [k, v] of Object.entries(o)) {
                r[v.toString()] = k;
            }
            return r;
        }

        function EventNotifier(val){
            if (!val) {
                return "None";
            }
            return  [(val & 2**0 ? "SubscribeToEvents" : null),
                (val & 2**2 ? "HistoryRead" : null),
                (val & 2**3 ? "HistoryWrite" : null)].filter(Boolean)
        }
        function AccessLevel(val){
            if (!val) {
                return "None";
            }
            return  [(val & 2**0 ? "CurrentRead" : null),
                (val & 2**1 ? "CurrentWrite" : null),
                (val & 2**2 ? "HistoryRead" : null),
                (val & 2**3 ? "HistoryWrite" : null),
                (val & 2**4 ? "SemanticChange" : null),
                (val & 2**5 ? "StatusWrite" : null),
                (val & 2**6 ? "TimestampWrite" : null),
                (val & 2**8 ? "NonatomicRead" : null),
                (val & 2**9 ? "NonatomicWrite" : null),
                (val & 2**10 ? "WriteFullArrayOnly" : null),
            ].filter(Boolean)
        }

        function MinimumSamplingInterval(val){
            if(val === -1) return "indeterminate"
            else if(val === 0) return "continuously"
            else return val
        }

        function AccessRestrictions(val){
            if (!val) {
                return "None";
            }
            return [(val & 2**0 ? "SigningRequired" : null),
                (val & 2**1 ? "EncryptionRequired" : null),
                (val & 2**2 ? "SessionRequired" : null)
            ].filter(Boolean)
        }

        function AttributeWriteMask(val){
            if (!val) {
                return "None";
            }
            return [(val & 2**0 ? "AccessLevel" : null),
                (val & 2**1 ? "ArrayDimensions" : null),
                (val & 2**2 ? "BrowseName" : null),
                (val & 2**3 ? "ContainsNoLoops" : null),
                (val & 2**4 ? "DataType" : null),
                (val & 2**5 ? "Description" : null),
                (val & 2**6 ? "DisplayName" : null),
                (val & 2**7 ? "EventNotifier" : null),
                (val & 2**8 ? "Executable" : null),
                (val & 2**9 ? "Historizing" : null),
                (val & 2**10 ? "InverseName" : null),
                (val & 2**11 ? "IsAbstract" : null),
                (val & 2**12 ? "MinimumSamplingInterval" : null),
                (val & 2**13 ? "NodeClass" : null),
                (val & 2**14 ? "NodeId" : null),
                (val & 2**15 ? "Symmetric" : null),
                (val & 2**16 ? "UserAccessLevel" : null),
                (val & 2**17 ? "UserExecutable" : null),
                (val & 2**18 ? "UserWriteMask" : null),
                (val & 2**19 ? "ValueRank" : null),
                (val & 2**20 ? "WriteMask" : null),
                (val & 2**21 ? "ValueForVariableType" : null),
                (val & 2**22 ? "DataTypeDefinition" : null),
                (val & 2**23 ? "RolePermissions" : null),
                (val & 2**24 ? "AccessRestrictions" : null),
                (val & 2**25 ? "AccessLevelEx" : null),
            ].filter(Boolean)
        }

        function toString1(attribute, dataValue) {
            if (!dataValue || !dataValue.value || !dataValue.value.hasOwnProperty("value")) {
                return "<null>";
            }
            /** @see https://reference.opcfoundation.org/v104/Core/docs/Part3/ for the structure of the attributes
             *  Cases that are commented out yet have to be implemented.
             *  This is just extra / prettier data. The value of the read service will in the json file anyway.
             */
            switch (AttributeIds[attribute]) {

                // case AttributeIds.InverseName:
                // case AttributeIds.ArrayDimensions:
                // case AttributeIds.RolePermissions:
                // case AttributeIds.UserRolePermissions:
                case AttributeIds.Description:
                case AttributeIds.DisplayName:
                    return {
                        "Locale": dataValue.value.value.locale ? dataValue.value.value.locale : "None",
                        "Text": dataValue.value.value.text ? dataValue.value.value.text : "None",
                    }
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
                    return null
            }
        }

        /** Checking if the attribute is writable. UserWriteMask is used, because
         *  UserWriteMask Attribute can only further restrict the WriteMask.
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part3/5.2.8/
         */
        async function writableCheck(currentSession, attributeName, node) {
            const res = await currentSession.read({
                nodeId: node,
                attributeId: AttributeIds["UserWriteMask"]
            });
            if(res.value.value === 0) return false;
            return AttributeWriteMask(res.value.value).includes(attributeName);
        }

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        /** Validation of the URI path element for the attribute.
         *  It's also possible to use the identifiers of the attributes in the URI.
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part6/A.1/
         */
        if(!isNaN(attributeId)) attributeId = AttributeIds[attributeId];
        if(AttributeIds[attributeId] === undefined)
            throw new Error("This is not an attribute.")


        const client = await connect();
        const session = await client.createSession(userIdentity);

        const readResult = await session.read({
            nodeId: nodeId,
            attributeId: AttributeIds[attributeId]
        });
        /** Checking if the attribute is supported for the specified node. */
        if (readResult.statusCode !== StatusCodes.Good) {
            await client.disconnect();
            console.log(getStatusCodeFromCode(readResult.statusCode.value))
            throw new Error(getStatusCodeFromCode(readResult.statusCode.value));
        }

        delete readResult.statusCode;

        /** Providing additional or prettier data. */
        const additionalData = toString1(attributeId, readResult);
        let result = readResult.toJSON()
        if(additionalData)
            result[attributeId] = additionalData;

        const writable = await writableCheck(session, attributeId, nodeId);

        await session.close();
        await client.disconnect();

        result = {"_links": {
            "self" : {"href": `/nodes/${encodeURIComponent(nodeId)}/${attributeId}`}
        }, ...result}
        if(writable) result._links.update ={
            "href": "/nodes/"+encodeURIComponent(nodeId)+"/"+attributeId,
            "method": "PUT"
        }
        return result;
    } catch
        (err) {
        throw new Error(err.message);
    }
}

