var exec = require('child_process').exec;

const images = [
    {
        name:"first",
        location:"./test",
        count:1,
        internalPort:8000,
        externalPort:4000
    },
    {
        name:"second",
        location:"./test",
        count:1,
        internalPort:8001,
        externalPort:4001
    }
];


class Orchestration{
    constructor(images){
        this.formattedImages = images.map((image)=>({
            ...image,
            id:String(Date.now())
        }));
    }

    callHealthCheck(){
        const errored = [];
        this.formattedImages.forEach((image)=>{
            exec(`docker ps -aqf "name=${image.id}"`,function(error, stdout, stderr){
                errored.push(image);
            });
        });
        this.runImages(errored);
    }


    buildImages(images){
        const erroredImages = [];
        images.forEach((image)=>{
            exec(`docker build -t ${image.id} --build-arg port=${image.internalPort} ${image.imageLocation}`,function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                erroredImages.push(image);
            });
        });
        return erroredImages;
    }

    runImages(images){
        const erroredImages = [];
        images.forEach((image)=>{
            exec(`docker run -p ${image.externalPort}:${image.internalPort} -d ${image.id}`, function(error, stdout, stderr){
                console.log('stdout',stdout);
                console.log('stderr',stderr);
                if( error !== null ){
                    console.log('exec ', error);
                }
                erroredImages.push(images);
            });
        });
        return erroredImages;
    }

    setupOrchestration(){
        let errored = this.buildImages(this.formattedImages);
        if(errored.length > 0){
            this.buildImages(errored);
        }
        errored = this.runImages(this.formattedImages);
        if(errored.length > 0){
            this.runImages(errored);
        }
    }

    runOrchestration(){
        setInterval(callHealthCheck,2000);
    }
}

function start(){
    const instance = new Orchestration();
    instance.setupOrchestration();
    instance.runOrchestration();
}

start();