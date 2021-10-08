import {OPCUAClient, AttributeIds, coerceNodeId, DataType, AggregateFunction, StatusCodes} from "node-opcua";
import {connect} from "./client-connect.js";

const endpoint = "opc.tcp://MacBook-Pro.fritz.box:53530/OPCUA/SimulationServer";

async function acknowledgeCondition(nodeId, eventToAckId, optionalComment = null) {
    try {
        const client = await connect();
        const session = await client.createSession();
        await session.acknowledgeCondition(nodeId, eventToAckId, optionalComment);
        await session.close();
        await client.disconnect();
    } catch (err) {
        console.log(err);
    }
}

async function addCommentCondition(nodeId, eventId, comment) {
    try {
        const client = await connect();
        const session = await client.createSession();
        await session.acknowledgeCondition(nodeId, eventId, comment);
        await session.close();
        await client.disconnect();
    } catch (err) {
        console.log(err);
    }
}




export {
    acknowledgeCondition,
    addCommentCondition,
}