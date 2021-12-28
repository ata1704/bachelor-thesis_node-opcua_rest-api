const {StatusCodes, AttributeIds, NodeClass, accessLevelFlagToString} = require("node-opcua");
const {AttributeIdToString, EventNotifier, LocalText} = require("./AttributeDetails");

module.exports = async function getPossibleAttributes(nodeId, session) {
    try {

        function attributes(attribute, dataValue) {
            if (!dataValue || !dataValue.value || !dataValue.value.hasOwnProperty("value")) {
                return "null";
            }
            switch (attribute) {
                case AttributeIds.NodeClass:
                    return NodeClass[dataValue.value.value];
                /**
                 *  EventNotifier uses the following bitmask:
                 *  @see https://reference.opcfoundation.org/v104/Core/DataTypes/EventNotifierType/
                 */
                case AttributeIds.EventNotifier:
                    return EventNotifier(dataValue.value.value);
                case AttributeIds.NodeId:
                case AttributeIds.BrowseName:
                    if (!dataValue.value.value) {
                        return null;
                    }
                    return dataValue.value.value.toString();
                case AttributeIds.DisplayName:
                case AttributeIds.Description:
                    return LocalText(dataValue.value.value);
                case AttributeIds.AccessLevel:
                    if (!dataValue.value.value) {
                        return "null";
                    }
                    return accessLevelFlagToString(dataValue.value.value);
            }
        }

        /**
         *  "AttributeIds" gives a list of all possible attributes and can be used to get the key of the attribute.
         */
        const attributeKeys = [];
        for (let i = 1; i <= AttributeIds.LAST - 1; i++) {
            attributeKeys.push(AttributeIds[i]);
        }

        /** Generate a list of all attributes to check them.*/
        const attributesToRead = attributeKeys.map((attributeId) => ({
            nodeId: nodeId,
            attributeId: AttributeIds[attributeId],
        }));

        const result = {"availableAttributes": [], "embeddedAttributes": {}};

        const dataValues = await session.read(attributesToRead);

        for (let i = 0; i < attributesToRead.length; i++) {
            const attributeToRead = attributesToRead[i];
            const dataValue = dataValues[i];
            /** If status code is not good the attribute is not supported for the specified node. */
            if (dataValue.statusCode !== StatusCodes.Good) {
                continue;
            }
            /** Adding the embedded attributes. */
            if (i <= 4) {
                result.embeddedAttributes[AttributeIdToString[attributeToRead.attributeId]] =
                    attributes(attributeToRead.attributeId, dataValue);
            }
            /** Checking if historyRead is available in EventNotifier or UserAccessLevel (bit 2 must be set) */
            if (i === 17 || i === 11)
                result.historyRead = !!(dataValue.value.value & 2 ** 2);
            /** Checking if Subscription is available in EventNotifier (bit 1 must be set) */
            if (i === 11)
                result.subscribableToEvents = !!(dataValue.value.value & 2 ** 0);
            if (i === 21)
                result.executable = dataValue.value.value;
            result.availableAttributes.push(AttributeIdToString[attributeToRead.attributeId]);
        }
        return result;

    } catch
        (err) {
        throw new Error(err.message);
    }
};