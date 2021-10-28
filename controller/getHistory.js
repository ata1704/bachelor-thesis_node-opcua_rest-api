const {
    StatusCodes,
    UserTokenType, AttributeIds
} = require("node-opcua");
const connect = require("./client-connect");
const {EventNotifier, AccessLevel} = require("./AttributeDetails");

module.exports = async function getHistory(nodeId, start, end, login, password) {
    try {

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect();
        const session = await client.createSession(userIdentity);

        const startTime = new Date(start);
        /** If the end time is not provided, the current time is used.*/
        const endTime = end === undefined ? new Date() : new Date(end);

        /** Checking if startTime and endTime are valid. */
        if (isNaN(startTime.getTime()))
            throw new Error(`"start" should be a date!`);
        if (isNaN(endTime.getTime()))
            throw new Error(`"end" should be a date!`);

        /** Checking if historyRead is allowed for this node. */
        const historyReadAllowed = await session.read([
            {nodeId: nodeId, attributeId: AttributeIds["UserAccessLevel"]},
            {nodeId: nodeId, attributeId: AttributeIds["EventNotifier"]}]);
        if (historyReadAllowed[0].statusCode === StatusCodes.Good)
            if (!AccessLevel(historyReadAllowed[0].value.value).includes("HistoryRead"))
                throw new Error("History read is not allowed for this Node.");
        if (historyReadAllowed[1].statusCode === StatusCodes.Good)
            if (!EventNotifier(historyReadAllowed[1].value.value).includes("HistoryRead"))
                throw new Error("History read is not allowed for this Node.");

        /** HistoryRead */
        const historyResult = await session.readHistoryValue(nodeId, startTime, endTime);
        if (historyResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(historyResult.statusCode);
        }

        await session.close();
        await client.disconnect();

        if (historyResult.historyData.dataValues)
            historyResult.historyData.dataValues.forEach(item => delete item.statusCode);

        return {
            "_links": {
                "self": {"href": "/api/nodes/" + encodeURIComponent(nodeId) + "?start=" + start + (end ? "&end=" + end : "")},
                "template": {
                    "href": `/api/nodes/${encodeURIComponent(nodeId)}{?startTime,endTime}`,
                    "templated": true,
                    "TimeFormat": "YYYY-MM-DDTHH:mm:ss.sssZ"
                },
                "Node:": {"href": "/api/nodes/" + encodeURIComponent(nodeId)},
            },
            "HistoryData": historyResult.historyData.dataValues
        };
    } catch
        (err) {
        console.log(err.message);
        throw new Error(err.message);
    }
};