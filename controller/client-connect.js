import {OPCUAClient} from "node-opcua";

const endpointUri = process.env.serverURL ? process.env.serverURL : console.log("endpointUri is not set!");

export default async function connect() {

    /*
        Endpoint verification must be must be set to 'true' to prevent the man-in-the- middle attack.
        To use the api with localhost the environment variable 'DEBUG' must be set.
    */

    let endpointMustExist = false;
    if(!process.env.DEBUG) endpointMustExist = true;

    const client = OPCUAClient.create({
        endpoint_must_exist: false,

        // Connection strategy defines the behaviour if the client cannot establish a connection to the server
        connectionStrategy: {
            initialDelay: 1000,
            maxDelay: 1100,
            maxRetry: 3,
        },
    });

    // Eventlistener if the server is not reachable.
    client.on("backoff", (retry, delay) => {
        console.log(
            `Connection could not be established for the ${retry+1} time. Next try in ${delay/1000} seconds...`);
    });

    await client.connect(endpointUri);
    return client;
}

