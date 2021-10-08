import {
    StatusCodes,
    UserTokenType,
    SecurityPolicy,
    AttributeIds,
    QualifiedName,
    referenceTypeToString,
    coerceNodeId,
} from "node-opcua";
import {connect} from "./client-connect.js";

export default async function getHistory(nodeId, start, end, login, password) {
    try {

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect();
        const session = await client.createSession(userIdentity);

        const startTime = new Date(start);
        const endTime = new Date(end);


        const historyResult = await session.readHistoryValue(nodeId, startTime, endTime);
        if (historyResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(historyResult.statusCode);
        }

        await session.close();
        await client.disconnect();
        historyResult.historyData.dataValues.forEach(item => delete item.statusCode);

        return {
            "_links": {
                "self": {"href": "/nodes/"+encodeURIComponent(nodeId)+"?start="+start+(end ? "&end="+end : "")},
                "template" :{
                    "href": `/nodes/${encodeURIComponent(nodeId)}{?startTime,endTime}`,
                    "templated": true,
                    "TimeFormat": "YYYY-MM-DDTHH:mm:ss.sssZ"
                },
                "Node:": {"href": "/nodes/"+encodeURIComponent(nodeId)},
            },
            "HistoryData": historyResult.historyData.dataValues
        }

    } catch
        (err) {
        throw new Error(err.message);
    }
}