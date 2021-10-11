const {StatusCodes, UserTokenType, Variant} = require("node-opcua");
const connect = require("./client-connect");

module.exports = async function call(methodId, objectId, inputArguments, login, password) {
    try {

        const userIdentity = (login || password) === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };

        const client = await connect();
        const session = await client.createSession(userIdentity);

        /** ----- Example with Prosys OPC UA Simulation Server -----------
            (ns6: http://www.prosysopc.com/OPCUA/SampleAddressSpace)
            Address: .../api/method-call/ns=6;s=MyMethod
            Request body:
            {
                "objectId": "ns=6;s=MyDevice",
                "inputArguments": [
                    {
                        "dataType": 12,
                        "value": "sin"
                    },
                    {
                        "dataType": 11,
                        "value": 1
                    }
                ]
            }
        */


        /** ----- Datatypes -----------
            The data type must be assigned as an Number. You can find the IDs for the data types under:
            https://node-opcua.github.io/api_doc/2.32.0/enums/node_opcua_variant.datatype.html
        */
        // inputArguments.forEach((item, index) => {
        //     if (Number.isInteger(item.dataType))
        //         new Variant(item);
        //     else
        //         throw new Error(`The data type of the input variable ${index + 1} must be assigned as an Integer.`);
        // });
        inputArguments.forEach(item =>
        delete item.name)
        console.log(methodId)
        console.log(objectId)
        console.log(inputArguments)

        const callMethodResult = await session.call(
            {
                methodId: methodId,
                objectId: objectId,
                inputArguments: inputArguments
            }
        );

        console.log()
        await session.close();
        await client.disconnect();

        //  toJSONFULL() returns a more detailed OPC UA status code, including the name and description.
        if (callMethodResult.statusCode !== StatusCodes.Good)
            return callMethodResult.statusCode.toJSONFull();
        return callMethodResult.toJSON();
    } catch (err) {
        throw new Error(err.message);
    }
}