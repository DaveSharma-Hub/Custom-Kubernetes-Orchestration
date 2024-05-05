const { Scheduler } = require("./scheduler/scheduler");
const images = require('../config.json');

const main = async () => {
    const runner = new Scheduler(images);
    await runner.startup();
};

main().then().catch();