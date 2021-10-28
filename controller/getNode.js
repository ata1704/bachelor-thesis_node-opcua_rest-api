const {StatusCodes, UserTokenType, BrowseDirection, NodeClass} = require("node-opcua");
const connect = require("./client-connect");
const getPossibleAttributes = require("./getPossibleAttributes");

module.exports = async function getNode(nodeId, login, password) {
    try {

        const userIdentity = login === "" || password === "" ? null : {
            type: UserTokenType.UserName,
            userName: login,
            password: password
        };
        const client = await connect();
        const session = await client.createSession(userIdentity);

        /** requestedMaxReferencesPerNode set to '0' means there's no maximum of returned references. */
        session.requestedMaxReferencesPerNode = 0;

        const browseResult = await session.browse(nodeId);
        if (browseResult.statusCode !== StatusCodes.Good) {
            await session.close();
            await client.disconnect();
            throw new Error(browseResult.statusCode.toString());
        }

        const attributes = await getPossibleAttributes(nodeId, session);

        await session.close();
        await client.disconnect();

        const nodeURI = `/${encodeURIComponent(nodeId)}/`;
        const result = {
            "_links": {
                "self": {"href": "/api/nodes/" + encodeURIComponent(nodeId)}
            },
            "_embedded": attributes.embeddedAttributes
        };

        /** Check if references are available and if at least of them is a method: */
        if (browseResult.toJSON().references.length) {
            result._links.References = {"href": `/api/nodes${nodeURI}references`};
            for (let i = 0; i < browseResult.toJSON().references.length; i++) {
                if (browseResult.toJSON().references[i].nodeClass === "Method" && browseResult.toJSON().references[i].isForward === true) {
                    result._links.Methods = {"href": `/api/nodes${nodeURI}methods`};
                    break;
                }
            }
        }
        /**
         *  This is the code for defining the path for historyRead.
         *  The attribute "templated" indicates that an URI template is used as recommended by the json-hal specification.
         *  @see https://tools.ietf.org/id/draft-kelly-json-hal-01.html#rfc.section.5.1
         *
         *  The relative path is constructed according to:
         *  @see https://datatracker.ietf.org/doc/html/rfc6570#section-3.2.8
         *  The template "{?start,end}" can be equated to the path expansion "?start=...&end=..."
         *
         *  The path is only set if the EventNotifier or the AccessLevel hold the value "HistoryRead":
         *  @see https://reference.opcfoundation.org/v104/Core/docs/Part4/5.10.3/
         */
        if (attributes.historyRead) result._links.HistoryRead = [{
            "href": `/api/nodes/${encodeURIComponent(nodeId)}{?start,end}`,
            "templated": true,
            "TimeFormat": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }, {
            "href": `/api/nodes/${encodeURIComponent(nodeId)}{?start}`,
            "templated": true,
            "TimeFormat": "YYYY-MM-DDTHH:mm:ss.sssZ",
            "description": "current time is used for end time"
        }];

        /**
         *  It's only possible to subscribe to a Value of a variable or Events of an Object (if EventNotifier is set accordingly).
         *  @see: https://documentation.unified-automation.com/uasdkhp/1.4.1/html/_l2_ua_subscription.html
         */
        if (attributes.subscribableToEvents || attributes.availableAttributes.includes("Value"))
            result._links.subscription = {"href": `/api/nodes${nodeURI}subscription`, "method": "WebSocket"};
        attributes.availableAttributes.forEach((attribute) => {
            result._links[attribute] = {"href": `/api/nodes${nodeURI}${attribute}`};
        });

        return result;

    } catch
        (err) {
        console.log(err.message);
        throw new Error(err.message);
    }
};