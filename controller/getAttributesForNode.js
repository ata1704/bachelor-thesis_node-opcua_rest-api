import {StatusCodes, AttributeIds, NodeClass, accessLevelFlagToString, VariantArrayType, DataTypeIds} from "node-opcua";

export default async function getAttributesForNode(nodeId, session) {
    try {
        const attributeIdToString = invert(AttributeIds);
        const DataTypeIdsToString = invert(DataTypeIds);

        function invert(o)  {
            const r = {};
            for (const [k, v] of Object.entries(o)) {
                r[v.toString()] = k;
            }
            return r;
        }

        function dataValueToString(dataValue) {
            if (!dataValue.value || dataValue.value.value === null) {
                return "<???> : " + dataValue.statusCode.toString();
            }
            switch (dataValue.value.arrayType) {
                case VariantArrayType.Scalar:
                    return dataValue.toString();
                case VariantArrayType.Array:
                    return dataValue.toString();
                default:
                    return "";
            }
        }

        function toString1(attribute, dataValue) {
            if (!dataValue || !dataValue.value || !dataValue.value.hasOwnProperty("value")) {
                return "<null>";
            }
            switch (attribute) {
                case AttributeIds.DataType:
                    return DataTypeIdsToString[dataValue.value.value.value] + " (" + dataValue.value.value.toString() + ")";
                case AttributeIds.NodeClass:
                    return NodeClass[dataValue.value.value] + " (" + dataValue.value.value + ")";
                case AttributeIds.IsAbstract:
                case AttributeIds.Historizing:
                case AttributeIds.EventNotifier:
                    return dataValue.value.value ? "true" : "false";
                case AttributeIds.WriteMask:
                case AttributeIds.UserWriteMask:
                    return " (" + dataValue.value.value + ")";
                case AttributeIds.NodeId:
                case AttributeIds.BrowseName:
                case AttributeIds.DisplayName:
                case AttributeIds.Description:
                case AttributeIds.ValueRank:
                case AttributeIds.ArrayDimensions:
                case AttributeIds.Executable:
                case AttributeIds.UserExecutable:
                case AttributeIds.MinimumSamplingInterval:
                    if (!dataValue.value.value) {
                        return "null";
                    }
                    return dataValue.value.value.toString();
                case AttributeIds.UserAccessLevel:
                case AttributeIds.AccessLevel:
                    if (!dataValue.value.value) {
                        return "null";
                    }
                    return accessLevelFlagToString(dataValue.value.value) + " (" + dataValue.value.value + ")";
                default:
                    return dataValueToString(dataValue);
            }
        }

        const attributeKeys = [];
        for(let i = 1; i <= AttributeIds.LAST - 1; i++){
            attributeKeys.push(AttributeIds[i]);
        }
        const attributesToRead = attributeKeys.map((attributeId)=>({
            nodeId: nodeId,
            attributeId: AttributeIds[attributeId],
        }));


        const dataValues = await session.read(attributesToRead);
        const result = [];
        for(let i = 0; i < attributesToRead.length; i++){
            const attributeToRead = attributesToRead[i];
            const dataValue = dataValues[i]
            if (dataValue.statusCode !== StatusCodes.Good){
                continue;
            }
            const s = toString1(attributeToRead.attributeId, dataValue);
            result.push({
                attribute: attributeIdToString[attributeToRead.attributeId],
                value: s,
            }
            );
        }

        return result;


    } catch
        (err) {
        throw new Error(err.message);
    }
}

