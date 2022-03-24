# opcua-rest-api

I made this api for the university Hochschule Merseburg as a part of my bachelor thesis.

OPC Unified Architecture (OPC UA) is a cross-platform, open-source standard for data exchange from sensors to cloud applications developed by the [OPC Foundation](https://opcfoundation.org/). It's one of the most important standards for Industry 4.0.


This api uses [node-opcua](https://node-opcua.github.io/) to act as an OPC UA client and access OPC UA servers.

I designed this api towards the demands and requirements of my professor and the Hochschule Merseburg. So keep that in mind if you may ask yourself why I've done some things this way. 
OPC UA is a really complex standard with a lot of capabilities that aren't even fully supported by some of the biggest companies in the OPC Foundation. That's why this api is far from a finished state and it may not satisfy all your needs.


## Getting started
To use this api you have to set some process variables:

| Name | Description |
| ----------- | ----------- |
| opcuaDiscoveryServerUrl | URL to the OPC UA Discovery Server |
| debug | Set this to any value to see HTTP and WebSocket connections in the console. |
| opcuaLocal | Must be set to any value if the api and any of the OPC UA Servers are running on the same machine. |

Right now only UA TCP endpoints with [Security Mode *Sign* and Security Policy *Basic256Sha256*](https://documentation.unified-automation.com/uagateway/1.5.1/html/L2UaDiscoveryConnect.html) are supported.

The username and password must be send via [basic access authentication](https://en.wikipedia.org/wiki/Basic_access_authentication).


