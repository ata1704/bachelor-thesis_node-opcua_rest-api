const {TimestampsToReturn, ClientMonitoredItemGroup, UserTokenType, AttributeIds} = require("node-opcua");
const connect = require("./client-connect");
const socketCollection = require("../bin/socketCollection");

module.exports = async function subscription(socketId, message) {

    /** ------- Example for itemToMonitor ---------
            {
                "login": "user1",
                "password": "password1",
                "attributeId": 13,
                "nodeId": "nodeId"
             }

     *  attribute-Ids: https://reference.opcfoundation.org/v104/Core/docs/Part6/A.1/
     */
    if (isNaN(message.attributeId)) message.attributeId = AttributeIds[message.attributeId]; // Returns the identifier for given the attribute.
    else parseInt(message.attributeId);

    const itemsToMonitor = [{
        "attributeId" : message.attributeId,
        "nodeId": message.nodeId
    }];
    console.log(itemsToMonitor);
    const userIdentity = (message.login || message.password) === "" ? null : {
        type: UserTokenType.UserName,
        userName: message.login,
        password: message.password
    };
    console.log(userIdentity);


    const ws = (() => {
        const result  = socketCollection.filter(function(x){return x.id === socketId;} );
        return result ? result[0].socket : null;
    })();

    try {
        const client = await connect();
        const session = await client.createSession(userIdentity);

        // ToDo: Question: Should the CreateSubscriptionRequestOptions set by the client or the server?
        const subscription = await session.createSubscription2({
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            requestedPublishingInterval: 1000
        });

        const optionsGroup = {
            discardOldest: true,
            queueSize: 1,
            samplingInterval: 10
        };

        const monitoredItemGroup = ClientMonitoredItemGroup.create(
            subscription,
            itemsToMonitor,
            optionsGroup,
            TimestampsToReturn.Both
        );

        monitoredItemGroup.on("changed",
            (monitoredItem, dataValue, index) => {
                ws.send(JSON.stringify({index: index, dataValue: dataValue.value}));
                console.log(JSON.stringify({index: index, dataValue: dataValue.value}))
            }
        );

        ws.on('close', async() => {
            try {
                await subscription.terminate();
                await session.close();
                await client.disconnect();
            }
            catch (error){
                ws.send(error.message);
            }
        })

    } catch (err) {
        ws.send(err.message);
    }
}