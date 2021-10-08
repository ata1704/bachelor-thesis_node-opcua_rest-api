import {coerceNodeId, StatusCodes} from "node-opcua";
import {connect} from "./client-connect.js";

async function extractNamespaceDataType() {
    try {
        const client = await connect();
        const session = await client.createSession();

        const extraDataTypeManager = await session.extractNamespaceDataType();

        await session.close();
        await client.disconnect();

        return extraDataTypeManager;
    } catch (err) {
        throw new Error(err.message);
    }
}
async function getDataTypeFactory(nameSpaceIndex) {
    try {
        const client = await connect();
        const session = await client.createSession();

        // ExtraDataTypeManager.getDataTypeFactoryForNamespace() and getDataTypeFactory() from node-opcua are the same
        const extraDataTypeManager = await session.extractNamespaceDataType();
        const dataTypeFactory = await extraDataTypeManager.getDataTypeFactory(nameSpaceIndex);

        console.log(dataTypeFactory);

        await session.close();
        await client.disconnect();

        return dataTypeFactory;
    } catch (err) {
        throw new Error(err.message);
    }
}

async function getExtensionObjectConstructorFromBinaryEncoding(binaryEncodingNodeId) {
    try {
        const client = await connect();
        const session = await client.createSession();
        console.log(binaryEncodingNodeId);

        const extraDataTypeManager = await session.extractNamespaceDataType();
        const baseUAObjectConstructable = await extraDataTypeManager.getExtensionObjectConstructorFromBinaryEncoding(coerceNodeId(binaryEncodingNodeId));

        await session.close();
        await client.disconnect();

        return baseUAObjectConstructable;
    } catch (err) {
        throw new Error(err.message);
    }
}

export {extractNamespaceDataType, getDataTypeFactory, getExtensionObjectConstructorFromBinaryEncoding}

