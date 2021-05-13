import {OPCUAClient} from "node-opcua";

export default async function connect(endPointUri) {
    const client = OPCUAClient.create({
        //endpoint verification gibt sonst einen Error aus, bei localhost:
        endpoint_must_exist: false,

        //Parameter für einen erneuten Aufbau der Verbindung, bei einem Scheitern:
        connectionStrategy: {
            initialDelay: 1000,
            maxDelay: 1100,
            maxRetry: 3,
        },
    });

    //Eventlistener für schiefgelaufene Verbindungen:
    client.on("backoff", (retry, delay) => {
        console.log(
            `Verbindung zum zum Endpunkt konnte ${retry+1} mal nicht hergestellt werden. Nächster versuch in ${delay/1000} Sekunden.`);
    });

    await client.connect(endPointUri);
    return client;

    //return await client.createSession();
}

