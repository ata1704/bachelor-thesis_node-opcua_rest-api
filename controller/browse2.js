import {StatusCodes, UserTokenType, makeBrowsePath} from "node-opcua";
import {connect} from "./client-connect.js";

export default async function browse(nodeToBrowse, maxRef = 0, login, password) {
    try {
        const userIdentity = (login || password) === "" ? null : {
                type: UserTokenType.UserName,
                userName: login,
                password: password
        };

        const client = await connect();
        const session = await client.createSession(userIdentity);

        const path = await session.translateBrowsePath(makeBrowsePath("RootFolder", "/" + nodeToBrowse));
        if(path.statusCode !== StatusCodes.Good)
            return path.statusCode.toJSONFull();
        const myNode = nodeToBrowse === "" ? "RootFolder" : path.targets[0].targetId;
        const browseResult = await session.browse(myNode);

        await session.close();
        await client.disconnect();

        //  toJSONFULL() returns a more detailed OPC UA status code, including the name and description.
        if (browseResult.statusCode !== StatusCodes.Good)
            return browseResult.statusCode.toJSONFull();
        return browseResult.toJSON();

    } catch
        (err) {
        throw new Error(err.message);
    }
}