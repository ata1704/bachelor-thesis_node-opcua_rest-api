import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList, GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString
} from "graphql";
import {graphqlHTTP} from "express-graphql";
import express from 'express';
import browseQl from "../controller/browseQl.js";
import logger from "morgan";
import Debug from "debug";

const router = express.Router();
if(process.env.DEBUG){
    Debug.enable("node-opcua-api_*");
}
const debug = Debug("node-opcua-api_graphql:");
router.use(logger('dev', { stream: { write: msg => debug(msg.trimEnd()) } }));

const statusCode = new GraphQLObjectType({
    name: "statusCode",
    description: "This is the status code of a Node-OPCUA operation.",
    fields: {
        value: {type: GraphQLInt}
    }
})

const browseName = new GraphQLObjectType({
    name: "browseName",
    description: "This is the getNode name for browsing a node id.",
    fields: {
        namespaceIndex: {type: GraphQLInt},
        name: {type: GraphQLString}
    }
})

const displayName = new GraphQLObjectType({
    name: "displayName",
    description: "This is the display name of a node id.",
    fields: {
        locale: {type: GraphQLString},
        text: {type: GraphQLString}
    }
})

const reference = new GraphQLObjectType({
    name: "reference",
    description: "This is a reference to another node.",
    fields: {
        referenceTypeId: {type: GraphQLString},
        isForward: {type: GraphQLBoolean},
        nodeId: {type: GraphQLString},
        browseName: {type: browseName},
        displayName: {type: displayName},
        nodeClass: {type: GraphQLString},
        typeDefinition: {type: GraphQLString}
    }
})

const nodeReferences = new GraphQLObjectType({
    name: "nodeReferences",
    description: "All references belonging to a queried node id.",
    fields: {
        nodeId: {type: GraphQLString},
        statusCode: {type: statusCode},
        references: {type: new GraphQLList(reference)}
    }
})


const Query = new GraphQLObjectType({
    name: "Query",
    description: "This is a root query",
    fields: () => ({
        result: {
            type: nodeReferences,
            args: {
                nodeId: {type: GraphQLNonNull(GraphQLString)}
            },
            async resolve(root, args) {
                return await browseQl(args.nodeId);
            }
        }
    })
})

const schema = new GraphQLSchema({
    query: Query
})

router.use('/', graphqlHTTP({
    schema: schema,
    graphiql: true  //  Comment this out, if you don't need the simple to use tool to manually issue GraphQL queries
                    //  GraphQL is available under the url (graphql-address)/graphql
}))

/**
 *  Sample for a query of all parameters:
            {
              result(nodeId: "nodeToBrowse") {
                nodeId
                statusCode{
                  value
                }
                references{
                  referenceTypeId
                  isForward
                  nodeId
                  browseName{
                    namespaceIndex
                    name
                  }
                  displayName
                  {
                    locale
                    text
                  }
                  nodeClass
                  typeDefinition
                }
              }
            }
 */

export default router;