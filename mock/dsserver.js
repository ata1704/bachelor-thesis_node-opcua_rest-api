const {OPCUADiscoveryServer,MessageSecurityMode, SecurityPolicy} = require("node-opcua-server-discovery");

(async () => {
    try {
        const discoveryServer = new OPCUADiscoveryServer({port: 4840});
        await discoveryServer.start();
        console.log("discovery server started ");
        const endpointUrl = discoveryServer.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the discovery server endpoint url is ", endpointUrl);
    } catch (err) {
        console.log("error", err);
    }
})();

//opc.tcp://macbook-pro.fritz.box:4840
//opc.tcp://MacBook-Pro.fritz.box:4840