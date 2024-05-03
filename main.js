var exec = require('child_process').exec;

const images = require('./config.json');

class Orchestration{
    runningContainers = [];
    formattedImages = [];

    constructor(images){
        this.formattedImages = images.map((image)=>({
            ...image,
            id:`${image.name}${Date.now()-1}`
        }));
        this.retryCount = 3;
        console.log(this.formattedImages);
    }

    sysCall(command, onErrorFn, onSuccessFn = ()=>{}){
        return new Promise((res,rej)=>{
            exec(command,function(error,stdout, stderr){
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                    onErrorFn();
                }else{
                    onSuccessFn(stdout);
                }
                res();
            })
        });
    }

    async removeContainers(images){
        const removedContainersPromise = images.map(async (image)=>{
            await this.sysCall(`docker rm $(docker ps -aqf "name=${image.id}")`,()=>{});
        });
        await Promise.all(removedContainersPromise);
    }

    async callHealthCheck(images){
        console.log(images);
        const errored = [];
        const callHealthCheckPromise = images.map(async(image)=>{
            await this.sysCall(`docker container inspect -f '{{.State.Status}}' "${image.id}"`,()=>{
                errored.push(image);
            },(stdout)=>{
                if(stdout.includes("exited")){
                    errored.push(image);
                }
            });
        });

        await Promise.all(callHealthCheckPromise);
        await this.removeContainers(errored);
        await this.runImages(errored);
    }


    async buildImages(images){
        const erroredImages = [];
        const buildImagesPromise = images.map(async(image)=>{
            await this.sysCall(`docker build . -t ${image.id} -f ${image.location}`, ()=>{
                erroredImages.push(image);
            });
        });
        await Promise.all(buildImagesPromise);
        return erroredImages;
    }

    async runImages(images){
        const erroredImages = [];
        const runImagesPromise = images.map(async(image)=>{
            await this.sysCall(`docker run --detach --name=${image.id} --publish ${image.externalPort}:${image.internalPort} ${image.id} `,()=>{
                erroredImages.push(image);
            });
        });
        await Promise.all(runImagesPromise);
        return erroredImages;
    }

    async setupOrchestration(){
        let erroredBuild = await this.buildImages(this.formattedImages);
        if(erroredBuild.length > 0){
            // for(let retry=this.retryCount;retry>=0;retry--){
            //     erroredBuild = await this.buildImages(erroredBuild);
            // }
            await this.buildImages(erroredBuild);
        }
        const erroredBuilingImages = erroredBuild.reduce((acc,{id})=>{
            acc.add(id)
            return acc;
        },new Set());
        const builtImages = this.formattedImages.filter(({id})=>!erroredBuilingImages.has(id));
        let erroredRun = await this.runImages(builtImages);
        if(erroredRun.length > 0){
            // for(let retry=this.retryCount;retry>=0;retry--){
            //     erroredRun = await this.runImages(erroredRun);
            // }
            await this.runImages(erroredRun);
        }
    }

    async sleep(time){
        return new Promise((res,_)=>setTimeout(res,time));
    }
    async runOrchestration(){
        const fn = (time) => {
            this.callHealthCheck(this.formattedImages);
            setTimeout(() =>{
                fn(time);
            }, time);
        };

        await this.sleep(2000);
        setTimeout(()=>{
            fn(2000);
        }, 2000);
    }
}

async function start(){
    const instance = new Orchestration(images);
    await instance.setupOrchestration();
    await instance.runOrchestration();
}

start().then().catch();