const fs = require('fs').promises;
const discoveryServer = require("../controller/getServersFromDS");
const {arrayType} = require("./AttributeDetails");
const path = require('path');
let {Server} = require("../app")

module.exports = async function getServers() {
    try {
        let serverList = [];

        const data = await fs.readFile(path.join(__dirname, "..", ".servers.json"), 'utf8');
        if (data !== "") {
            serverList.push(...JSON.parse(data));
        }
        const arrayLength = serverList.length;

        const currentServers = await discoveryServer();

        currentServers.forEach(server => {
            if(!serverList.some(item => item.title === server.title && item.url === server.url)) {
                serverList.push(server)
            }
        });

        if (serverList.length > arrayLength) {
            Server.splice(0,Server.length)
            Server.push(...serverList);
            await fs.writeFile(path.join(__dirname, "..", ".servers.json"), JSON.stringify(serverList));
        }

        return serverList;
    } catch (err) {
        console.log(err);
    }
};


