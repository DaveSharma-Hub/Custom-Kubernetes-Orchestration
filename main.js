var exec = require('child_process').exec;

const { stdout } = require('process');
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
        console.log("Removed", images);
        const removedContainersPromise = images.map(async (image)=>{
            let containerId = null;
            await this.sysCall(`docker ps -aqf "name=${image.id}"`,()=>{},(stdout)=>{containerId=stdout});
            await this.sysCall(`docker rm ${containerId}`,()=>{});
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

        if(errored.length>0){
            await this.removeContainers(errored);
    
            await this.sleep(500);
            let removed = [];
            while(removed.length != errored.length){
                removed = [];
                const removedPromise = errored.map(async(image)=>{
                    await this.sysCall(`docker container inspect -f '{{.State.Status}}' "${image.id}"`,()=>{
                        removed.push(image);
                    },(stdout)=>{
                        if(stdout.includes(`No such container: ${image.id}`)){
                            removed.push(image);
                        }
                    });
                });
                await Promise.all(removedPromise);
            }
            await this.runImages(errored);
        }
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
        // const fn = (time) => {
        //     this.callHealthCheck(this.formattedImages);
        //     setTimeout(() =>{
        //         fn(time);
        //     }, time);
        // };

        // await this.sleep(2000);
        // setTimeout(()=>{
        //     fn(2000);
        // }, 2000);
        setInterval(()=>this.callHealthCheck(this.formattedImages), 2000);
    }
}

async function start(){
    const instance = new Orchestration(images);
    await instance.setupOrchestration();
    await instance.runOrchestration();
}

start().then().catch();