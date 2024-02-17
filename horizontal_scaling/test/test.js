const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:false}));


app.get('/test',(req,res)=>{
    res.send("Hello World");
});

app.listen(80,()=>{console.log('Listening on port 80')});
