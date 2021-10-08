import {MessageSecurityMode, OPCUAClient, SecurityPolicy} from "node-opcua";
import {v4 as uuidv4} from 'uuid';

const endpointUri = process.env.debug === "home" ? "opc.tcp://149.205.102.44:4840" : process.env.serverURL;

export async function connect() {
    try {
     /**
      * To use the api with localhost or for testing the environment variable 'debug' must be set.
      */

        /*
            basic256sha256
            sign
            149.205.102.44:4840
            admin
            f09e2c06
         */

        const endpointMustExist = process.env.debug !== "local";

        let client = OPCUAClient.create({
            endpoint_must_exist: endpointMustExist,

            // Connection strategy defines the behaviour if the client cannot establish a connection to the server
            connectionStrategy: {
                initialDelay: 500,
                maxDelay: 501,
                maxRetry: 3,
            },
        });


        // Eventlistener if the server is not reachable.
        client.on("backoff", (retry, delay) => {
            console.log(
                `Connection could not be established for the ${retry + 1} time. Next try in ${delay / 1000} seconds...`);
        });

        await client.connect(endpointUri);

        return client;
    } catch (err) {
        throw new Error(err.message)
    }
}

