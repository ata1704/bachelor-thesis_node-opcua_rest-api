import {OPCUAClient, AttributeIds, coerceNodeId, DataType, AggregateFunction, StatusCodes} from "node-opcua";
import Connect from "./client-connect.js";

const endpoint = "opc.tcp://MacBook-Pro.fritz.box:53530/OPCUA/SimulationServer";


async function acknowledgeCondition(nodeId, eventToAckId, optionalComment = null) {
    try {
        const client = await Connect(endpoint);
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
        const client = await Connect(endpoint);
        const session = await client.createSession();
        await session.acknowledgeCondition(nodeId, eventId, comment);
        await session.close();
        await client.disconnect();
    } catch (err) {
        console.log(err);
    }
}

async function browse(nodeToBrowse) {
    try {
        const client = await Connect(endpoint);
        const session = await client.createSession();
        client.on("close", () => { console.log("connection abgebrochen");
        });
        session.requestedMaxReferencesPerNode = 2;

        const browseResult = await session.browse(nodeToBrowse);

        // await session.close();
        // await client.disconnect();

        // Gibt den ausführlicheren Statuscode inkl. 'name' und 'description' wieder
        if(browseResult.statusCode !== StatusCodes.Good) return browseResult.statusCode.toJSONFull();
        return browseResult.toJSON();

    } catch (err) {
        throw new Error(err.message);
    }
}

// BrowseNext verstößt gegen die Prinzipien der Statuslosigkeit, da die Session bestehen bleiben muss.
// BrowseNext verwendet einen ContinuationPoint, der beim schließen der Session gelöscht wird.

export {
    acknowledgeCondition,
    addCommentCondition,
    browse
}