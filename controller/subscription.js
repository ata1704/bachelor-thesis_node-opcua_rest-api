const {
    TimestampsToReturn,
    UserTokenType,
    AttributeIds,
    StatusCodes,
    constructEventFilter,
} = require("node-opcua");
const connect = require("./client-connect");

module.exports = async function subscription(ws, nodeId, login, password) {
    const userIdentity = login === "" || password === "" ? null : {
        type: UserTokenType.UserName,
        userName: login,
        password: password
    };

    try {
        const client = await connect();
        const session = await client.createSession(userIdentity);

        /** Check if there's the attribute Value or EventNotifier and in the latter if it's subscribable. */
        const attributes = await session.read([
            {nodeId: nodeId, attributeId: AttributeIds["EventNotifier"]},
            {nodeId: nodeId, attributeId: AttributeIds["Value"]}
        ]);

        let subscriptionType;
        if (attributes[0].statusCode === StatusCodes.Good) {
            if (attributes[0].value.value & 2 ** 0)
                subscriptionType = "EventNotifier";
            else {
                await session.close();
                await client.disconnect();
                ws.send("You cannot subscribe to this EventNotifier!");
                ws.close();
            }
        } else if (attributes[1].statusCode === StatusCodes.Good)
            subscriptionType = "Value";
        else {
            await session.close();
            await client.disconnect();
            ws.send("There's no Value or EventNotifier attribute that you can subscribe to.");
            ws.close();
        }

        const itemToMonitor = {
            "attributeId": AttributeIds[subscriptionType],
            "nodeId": nodeId
        };

        // ToDo: Option for the client to change that:
        let subscription = await session.createSubscription2({
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            requestedPublishingInterval: 1000
        });

        // ToDo: Option for the client to change that:
        /** Fields to return for EventNotifier:
         *  @see: https://reference.opcfoundation.org/v104/Core/docs/Part5/6.4.2/
         */
        const eventFilter = constructEventFilter([
            //"AuditEventType",
            //"SystemEventType",
            //"BaseModelChangeEventType",
            //"SemanticChangeEventType",
            //"EventQueueOverflowEventType",
            //"ProgressEventType",
            //"EventId",
            "EventType",
            "SourceNode",
            "SourceName",
            "Time",
            //"ReceiveTime",
            //"LocalTime",
            "Message",
            //"Severity"
        ]);

        // ToDo: Option for the client to change that partially:
        const monitoringOptions = {
            discardOldest: true,
            queueSize: 1,
            samplingInterval: subscriptionType === "Value" ? 10 : 3000,
            filter: subscriptionType === "EventNotifier" ? eventFilter : null
        };

        /** Start monitoring: */
        const monitoredItem = await subscription.monitor(
            itemToMonitor,
            monitoringOptions,
            TimestampsToReturn.Neither
        );

        /** EventListener that is sending messages, depending on the subscriptionType:*/
        monitoredItem.on("changed",
            async (dataValue) => {
                if (subscriptionType === "Value")
                    ws.send(JSON.stringify(dataValue.value));
                else {
                    ws.send(JSON.stringify({
                        "EventType": dataValue[0].value,
                        "EventTypeName": (await session.read({
                            nodeId: dataValue[0].value,
                            attributeId: AttributeIds["DisplayName"]
                        })).value.value.text,
                        "SourceNode": dataValue[1].value,
                        "SourceName": dataValue[2].value,
                        "Time": dataValue[3].value,
                        "Message": dataValue[4].value
                    }));
                }
            }
        );

        ws.on('message', () => {
            ws.send("Changing the settings of the subscription has not yet been implemented.");
        });

        ws.on('close', async () => {
            try {
                await subscription.terminate();
                await session.close();
                await client.disconnect();
            } catch (error) {
                ws.send(error.message);
            }
        });


    } catch (err) {
        console.log("catch");
        if (err.message.includes("Cannot find ANONYMOUS user token policy in end point description")) {
            ws.send("You did not provide any Authorization in the Header. Authorization should be Basic Auth.");
            ws.close();
            throw new Error("Cannot find ANONYMOUS user token policy in end point description");
        } else if (err.message.includes("BadIdentityTokenRejected (0x80210000)")) {
            ws.send("The username or password is wrong.");
            throw new Error("BadIdentityTokenRejected (0x80210000)");
        } else ws.send(err.message);
        ws.close();
        throw new Error(err.message);
    }
};