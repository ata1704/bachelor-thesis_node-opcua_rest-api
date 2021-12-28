const {OPCUAClient, MessageSecurityMode, SecurityPolicy} = require("node-opcua");
const {application} = require("express");
const fs = require("fs");


const endpointUri = process.env.opcuaDiscoveryServerUrl === "home" ? "opc.tcp://149.205.102.44:4840" : process.env.opcuaDiscoveryServerUrl;

module.exports = async function discoveryServer() {
    try {
        /** To use the api with localhost the environment variable 'opcuaLocal' must be set. */
        const endpointMustExist = !process.env.opcuaLocal;

        let client = OPCUAClient.create({
            endpointMustExist: endpointMustExist,

            /** Connection strategy defines the behaviour if the client cannot establish a connection to the server. */
            connectionStrategy: {
                initialDelay: 500,
                maxDelay: 501,
                maxRetry: 1,
            },
        });


        // /** Eventlistener if the server is not reachable: */
        // client.on("backoff", (retry, delay) => {
        //     console.log(
        //         `Connection could not be established for the ${retry + 1} time. Next try in ${delay / 1000} seconds...`);
        // });

        await client.connect(endpointUri);
        const discoveryServers = await client.findServers();
        const servers = [];
        for(let i = 1; i< discoveryServers.length; i++){
            servers.push(...discoveryServers[i].discoveryUrls)
        }
        const endpoints = [];
        for (const server of servers) {
            const client = OPCUAClient.create({
                endpointMustExist: endpointMustExist,
                connectionStrategy: { initialDelay: 500, maxDelay: 501,  maxRetry: 3,},
            });
            await client.connect(server)
            const rawEndpoints = await client.getEndpoints({endpointUrl: server});
            rawEndpoints.forEach(endpoint => {
                if(endpoint.securityMode === MessageSecurityMode.Sign && endpoint.securityPolicyUri === "http://opcfoundation.org/UA/SecurityPolicy#Basic256Sha256")
                    endpoints.push({"url": endpoint.endpointUrl, "title": endpoint.server.applicationName.text});
            });
            await client.disconnect();
        }

        await client.disconnect();

        return endpoints;
    } catch (err) {
        console.log("The connection cannot be established with DiscoverysServer "+ endpointUri
            + "\nLocal backup server list from .servers.json is used." )
        return []
    }
};