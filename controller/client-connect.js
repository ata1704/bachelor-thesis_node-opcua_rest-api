const {OPCUAClient, MessageSecurityMode, SecurityPolicy} = require("node-opcua");
const {Server} = require("../app")

//const endpointUri = process.env.opcuaServerUrl === "home" ? "opc.tcp://149.205.102.44:4840" : process.env.opcuaServerUrl;

module.exports = async function connect(serverId) {
    try {
        /** To use the api with localhost the environment variable 'opcuaLocal' must be set. */
        const endpointMustExist = !process.env.opcuaLocal;

        let client = OPCUAClient.create({
            endpointMustExist: endpointMustExist,
            securityMode: MessageSecurityMode.Sign,
            securityPolicy: SecurityPolicy.Basic256Sha256,

            /** Connection strategy defines the behaviour if the client cannot establish a connection to the server. */
            connectionStrategy: {
                initialDelay: 500,
                maxDelay: 501,
                maxRetry: 3,
            },
        });



        /** Eventlistener if the server is not reachable: */
        client.on("backoff", (retry, delay) => {
            console.log(
                `Connection could not be established for the ${retry + 1} time. Next try in ${delay / 1000} seconds...`);
        });
        await client.connect(Server[serverId-1].url);

        return client;
    } catch (err) {
        console.log(err.message)
        throw new Error(err.message);
    }
};