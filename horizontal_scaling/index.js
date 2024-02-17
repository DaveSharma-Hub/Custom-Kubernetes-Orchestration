import { exec } from 'child_process';
import fs from 'node:fs';

class DockerFileWriter{
    constructor({
        outputFileLocation,
        imageName,
        startup
    }){
        this.outputFileLocation = outputFileLocation;
        this.imageName = imageName;
        this.startup = startup;
    }

    getContent(){
        const content = `FROM ${this.imageName}\n`;
        return content;
    }

    create(){
        try {
            const content = this.getContent();
            fs.writeFileSync(`Dockerfile`, content);
          } catch (err) {
            console.error(err);
          }
    }
}


class HorizontalScalar{
    constructor({minPods, imageName, imageLocation, port}){
        this.minPods = minPods;
        this.imageName = imageName;
        this.imageLocation = imageLocation;
        this.imageCodes = [];
        this.checkHealth = false;
        this.portNumber = 8080;
        this.port = port;
    }

    async writePodImages(){
        this.podName = `${this.imageName}_pod`;
        this.podImageLocation = ".";
        new DockerFileWriter({
            outputFileLocation:this.podImageLocation,
            imageName:this.imageName,
        }).create();
    }

    async buildLocalImage(){
        await this.buildImage({
            id:this.imageName,
            imageLocation: this.imageLocation
        });
    }

    async buildImage(image){
        return new Promise((res)=>{
            const erroredImages = [];
            exec(`docker build -t ${image.id} ${image.imageLocation}`,function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
                }
                erroredImages.push(image);
                res();
            });
        });
    }

    async runImages(image){
        return new Promise((res)=>{
            exec(`docker run -d -p ${this.portNumber++}:${this.port} ${image.id}`, (error, stdout, stderr)=>{
                console.log('stdout',stdout);
                console.log('stderr',stderr);
                if( error !== null ){
                    console.log('exec ', error);
                }
                this.imageCodes.push({
                    imageName:image.id,
                    id:stdout.split('\n')[0]
                });
                // erroredImages.push(images);
                res();
            });
        })
    }

    async runPods(){
        const promiseArray = [...Array(this.minPods)].map((_,i)=>{
            this.runImages({id:`${this.podName}_${i}`});
        });
        await Promise.allSettled(promiseArray);
    }

    async createPods(){
        const promiseArray = [...Array(this.minPods)].map((_,i)=>{
            this.buildImage({
                id:`${this.podName}_${i}`,
                imageLocation:this.podImageLocation})
            });
        await Promise.allSettled(promiseArray);
    }

    async setup(){
        try{
            await this.buildLocalImage();
            await this.writePodImages();
            await this.createPods();
            await this.wait(30000);
        }catch(e){
            console.log(e);
            throw e;
        }
    }

    async start(){
        try{
            await this.runPods();
            if(this.checkHealth){
                await this.wait(5000);
                console.log("IMAGE CODE:", this.imageCodes);
                await this.scalingHealthCheck();
            }
        }catch(e){
            console.log(e);
            throw e;
        }
    }

    async ping(){
        const healthCheck = async(code) => {
            return new Promise((res)=>{
                exec(`docker container inspect -f '{{.State.Running}}' ${code}`, function(error, stdout, stderr){
                    console.log('stdout', stdout);
                    console.log('stderr', stderr);
                    if( error !== null ){
                        console.log('exec ', error);
                    }
                    if(stdout.includes("false")){
                        res(false);
                    }else{
                        res(true);
                    }
                });
            })
        }

        const promiseArray = this.imageCodes.map(async(i)=>{
            const v = await healthCheck(i.id);
            return {
                id:i.id,
                running:v,
                name: i.imageName
            };
        });
        const awaitedArray = await Promise.all(promiseArray);
        const failed = awaitedArray.filter(({running})=>running === false);
        return failed;
    }

    async wait(time){
        return new Promise((res)=>{
            setTimeout(res,time);
        });
    }

    async scalingHealthCheck(){
        const failedArray = await this.ping();
        this.imageCodes = this.imageCodes.filter((i)=>{
            for(const { id } of failedArray){
                if(id === i.id){
                    return false;
                }
            }
            return true;
        });
        if(failedArray.length > 0){
            const newImageIds = failedArray.map(({name},i)=>`${name}_${i}`);
            const buildPromiseArray = newImageIds.map((name)=>{
                this.buildImage({
                    id:name,
                    imageLocation:this.imageLocation
                });
            });
            await Promise.allSettled(buildPromiseArray);
            await this.wait(5000);
            const runPromiseArray = newImageIds.map((name)=>{
                this.runImages({id:name});
            });
            await Promise.allSettled(runPromiseArray);
        }
        console.log("failedArray:",failedArray);
        console.log("length:", failedArray.length);
        await this.wait(10000);
        await this.scalingHealthCheck();
    }

    setHealthCheck(){
        this.checkHealth = true;
        return this;
    }
}

(async function(){
    const scalar = new HorizontalScalar({
        minPods:4,
        imageName:"horizontaltest",
        imageLocation:"./test",
        port:80
    });
    await scalar.setup();
    scalar.setHealthCheck();
    await scalar.start();
}());