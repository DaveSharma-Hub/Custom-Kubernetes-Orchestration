const { Orchestration } = require('../orchestration/orchestration');
const { API } = require('../api/api'); 
const { v4: uuidv4 } = require('uuid');

class Scheduler{
    constructor(configuration){
        this.configuration = configuration;
        this.images = this.createOrchestrationImages(this.configuration);
        this.mapper = this.createAPIMapper(this.images);
        this.api = new API(this.mapper, 1000);
        // this.api = new API(this.mapper, configuration.port);
        this.orchestration = new Orchestration(this.images);
    }

    createAPIMapper(images){
        return () => {};
    }

    createOrchestrationImages(images){
        let startingExternalPort = 3000;
        return images.reduce((acc,{count, location, port})=>{
            for(let i=0;i<count;i++){
                const externalPort = (startingExternalPort) + i;
                acc.push({
                    "name":uuidv4(),
                    "location":location,
                    "internalPort":port,
                    "externalPort":externalPort
                });
            }
            startingExternalPort+=count;
            return acc; 
        },[]);
    }

    async startup(){
        console.log('Starting up instances');
        await this.orchestration.setupOrchestration();
        console.log('Containers running');
        await this.orchestration.runOrchestration();
        console.log('Orchestration tool running');
        this.api.setupApi();
        console.log('API setup');
        this.api.runApi();
        console.log('API now running');
    }

    async runScaling(){
        //for scaling instances based on api hit rate
    }
}


module.exports = {
    Scheduler: Scheduler
}