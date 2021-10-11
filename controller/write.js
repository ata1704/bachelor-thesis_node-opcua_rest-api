const {StatusCodes, AttributeIds, OPCUAClient, UserTokenType} = require("node-opcua");
const connect = require("./client-connect");

module.exports = async function write(nodeId, attributeId, value, login, password) {
    try {

        const userIdentity = (login || password) === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };

        const client = await connect();
        const session = await client.createSession(userIdentity);

        const response = await session.write(
            {
                nodeId: nodeId,
                attributeId: AttributeIds[attributeId],
                value: value
            }
        );

        await session.close();
        await client.disconnect();

        //  toJSONFULL() returns a more detailed OPC UA status code, including the name and description.
        if (response._value === StatusCodes.Good)
            return response.toJSONFull();
        return response.toJSON();

    } catch (err) {
        throw new Error(err.message);
    }
}