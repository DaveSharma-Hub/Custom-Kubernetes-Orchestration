const express = require('express');
const cors = require('cors');


class API{
    constructor(apiMapper, port){
        this.apiMapper = apiMapper;
        this.PORT = port;
        this.createApi();
    }

    createApi(){
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended:true}));
    }

    setupApi(){
        this.app.all('*',async (req,res,next)=>{
            console.log(req.method);
            console.log(req.url);
            next();

            const result = await this.apiMapper({
                method:req.method,
                url:req.url
            });
            if(result.shouldReturn){
                res.send(result.value);
            }
        });
    }

    runApi(){
        this.app.listen(this.PORT,()=>{
            console.log(`Listening on port ${this.PORT}`);
        });
    }
}

module.exports = {
    API:API
};