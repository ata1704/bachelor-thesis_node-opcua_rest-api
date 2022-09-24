const opcua = require("node-opcua");
const hostname = require("os").hostname();
const discoveryServerEndpointUrl = `opc.tcp://${hostname}:4840`;
(async () => {
    try {
        const server = new opcua.OPCUAServer({
            port: 1436,
            registerServerMethod: opcua.RegisterServerMethod.LDS,
            discoveryServerEndpointUrl: discoveryServerEndpointUrl,
            serverInfo: {
                     applicationName: "NodeOPCUA-Server2",
                //     applicationType: ,
                applicationUri: "Server2",
                //     discoveryProfileUri: ,
                //     discoveryUrls: ,
                //     gatewayServerUri: ,
                //     productUri: ,
                //
            }
        });
// let set the interval between two re-registration
// we will set 10 second here, it could be 8 or 10 minutes instead // the default value shall be sufficient
        server.registerServerManager.timeout = 10 * 1000;
// when server starts  it should end up registering itself to the LDS
        server.on("serverRegistered", () => {
            console.log("server serverRegistered");
        });
        // when the server will shut down it will unregistered itself from the LDS
        server.on("serverUnregistered", () => {
            console.log("server serverUnregistered");
        });
// on a regular basis, the serve will renew its registration to the lds server // the serverRegistrationRenewed is raised then.
        server.on("serverRegistrationRenewed", () => {
            console.log("server serverRegistrationRenewed");
        });
// if Discovery Server is not online, the serverRegistrationPending will be emit // every time the server try to reconnect and fails.
        server.on("serverRegistrationPending", () => {
            console.log("server serverRegistrationPending");
        });
        await server.start();
        const endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the server endpoint url is ", endpointUrl);
        await new Promise((resolve) => setTimeout(resolve, 200000));
        await server.shutdown();
    } catch (err) {
        console.log("error", err);
    }
})();