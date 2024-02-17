const app = require('express')();
const cors = require('cors');
var exec = require('child_process').exec;

// const PORT = 8000;
const threshold = 100;
let count = 0;
app.use(cors());

const pods = [];

/*
    imageNames ={
        name:String,
        initialPort:Integer
        imageLocation:String
    }
*/

function initImages(imageNames,numberOfPods){
    imageNames?.map((image)=>{
        const portMapArray = [];
        let firstPort = (image.initalPort);
        for(let i=0;i<numberOfPods;i=i+1){
            portMapArray.push(firstPort+1);
            firstPort=firstPort+1;
        }
        pods.push({
            image:image.name,
            portMaps:portMapArray,
            location:image.imageLocation,
            initalPort:image.initalPort
        })
    })
}

let objectPortMap = {};
function checkContainersCURL(){
    
    Object.entries(objectPortMap).map((containers)=>{
        const port = containers[1].exposedPort;
        console.log(port);
        exec(`curl -i localhost:${port}`,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    })
}

function checkContainerHealth(){
    
}

function mainOrchestration(imageNames,numberOfPods){
    // initImages(imageNames,numberOfPods);
    imageNames.map((image)=>{

    exec(`docker build -t ${image.name} ${image.imageLocation}`,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    })

    imageNames.map((image,index)=>{
        // docker run -p 49160:8080 -d <your username>/node-web-app
        objectPortMap[image.initalPort] = {
            index:index,
            exposedPort:4000+index,
            name:image.name
        };

        exec(`docker run -p ${4000+index}:${image.initialPort} -d ${image.name}`,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    })

    // exec(`docker run -p ${4000+index}:${image.initialPort} -d ${image.name}`,
    //     function (error, stdout, stderr) {
    //         console.log('stdout: ' + stdout);
    //         console.log('stderr: ' + stderr);
    //         if (error !== null) {
    //             console.log('exec error: ' + error);
    //         }
    //     });

    checkContainersCURL();
    setInterval(checkContainersCURL,3000);
    
}

const image = [
    {
        name:'first',
        initialPort:8000,
        imageLocation:'C:/Users/Daves/git/Custom-Kubernetes-Orchestration/test'
    }
]

mainOrchestration(image)
// app.get('/',(req,res)=>{    
// })
// app.listen(PORT,()=>{console.log(`Listening on Port ${PORT}`)});