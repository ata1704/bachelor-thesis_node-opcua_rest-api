const {StatusCodes, UserTokenType, BrowseDirection, AttributeIds, DataTypeIds, coerceNodeId, Variant} = require("node-opcua");
const connect = require("./client-connect");
const getPossibleAttributes = require("./getPossibleAttributes");
const Validator = require('jsonschema').Validator;
const v = new Validator();


module.exports = async function callMethod(methodId, nodeId, inputs, login, password) {
    try {

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect();
        const session = await client.createSession(userIdentity);

        /** Input arguments must be provides as an array of value objects, while each object is holding the following properties:
         *      {
         *          name:                   string
         *          arrayType (optional):   string | Scalar | Array | Matrix
         *          dataType:               string | Null | Boolean | SByte | Byte | Int16 | UInt16 | Int32 | UInt32 |
         *                                  Int64 | UInt64 | Float | Double | String | DateTime | Guid | ByteString |
         *                                  XmlElement | NodeId | ExpandedNodeId | StatusCode | QualifiedName | LocalizedText |
         *                                  ExtensionObject | DataValue | Variant | DiagnosticInfo
         *          value:                  any
         *      }
         *
         *  This is an example for 3x3 Matrix:
         *      {
         *          name:       "Parameter"
         *          arrayType:  { [Number: 2] key: 'Matrix', value: 2 },
         *          dataType:   { [Number: 11] key: 'Double', value: 11 },
         *          value:      Float64Array [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ]
         *      }
         *
         *  The demanded input arguments (scheme) can be found if the "Method" URI is retrieved.
         *  It's important that the input arguments are given in the same order as the arguments in the scheme.
         */

        const DataTypeIdsToString = invert(DataTypeIds);
        function invert(o)  {
            const r = {};
            for (const [k, v] of Object.entries(o)) {
                r[v.toString()] = k;
            }
            return r;
        }



        const browseResult = await session.browse(methodId)
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        let SchemeNodeId;
        browseResult.references.forEach(reference =>{
            if(reference.browseName.name.includes("InputArguments"))
                SchemeNodeId = reference.nodeId.toString();
        });

        function arrayType(val){
            if(val === 1 || val === -2 || val === -3) return "Array";
            else if(val >= 0) return "Matrix";
            else if(val === -1) return "Scalar";
            else return null;
        }

        const inputScheme = await session.read( {"nodeId": SchemeNodeId, "attributeId": AttributeIds["Value"]});

        /** Comparing the input scheme with the input values: */
        const inputArguments = [];
        if(!inputs) throw new Error(`Input error: The request body mustn't be empty!`);
        if(inputs.length !== inputScheme.value.value.length) throw new Error(`An input argument is missing.`);
        inputScheme.value.value.forEach((argument, index) => {
            if(argument.name !== inputs[index].name)
                throw new Error(`Input error: The name of the input argument ${index+1} is wrong or the arguments are not in the `+
                `required order. View the link of the "Method" URI to get the scheme.`);
            const variant = {};
            if(inputs[index].arrayType)
                if(arrayType(argument.valueRank) !== inputs[index].arrayType)
                    throw new Error(`Input error: The arrayType you've provided for input argument ${index+1} is not matching `+
                    `the scheme. View the link of the "Method" URI to get the scheme. Remember that this attribute `+
                    `is optional!`);
                else variant.arrayType = inputs[index].arrayType
            if(isNaN(inputs[index].dataType)) inputs[index].dataType = DataTypeIds[inputs[index].dataType]
            if(argument.dataType.value !== inputs[index].dataType)
                throw new Error(`Input error: The dataType of the input argument ${index+1} is wrong. View the link of the "Method" URI to get the scheme.`)
            else variant.dataType = inputs[index].dataType;
            variant.value = inputs[index].value;
            inputArguments.push(new Variant(variant));
        });

        const callMethodResult = await session.call(
            {
                methodId: methodId,
                objectId: nodeId,
                inputArguments: inputArguments
            }
        );

        await session.close();
        await client.disconnect();

        if(callMethodResult.statusCode !== StatusCodes.Good) {
            if (callMethodResult.statusCode === StatusCodes.BadArgumentsMissing)
                throw new Error("Input Error: One or more input arguments are missing.")
            else
                throw new Error(callMethodResult.statusCode.toString());
        }
        return callMethodResult.toJSON().outputArguments;

    } catch
        (err) {
        throw new Error(err.message);
    }
}