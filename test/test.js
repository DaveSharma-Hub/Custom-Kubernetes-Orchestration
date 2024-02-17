const app = require('express')();
const cors = require('cors');
const PORT = parseInt(process.argv[2]);
console.log(process.argv);
app.use(cors());
app.get('/getTest',(req,res)=>{
    res.send('TEST');
})
app.listen(PORT,()=>{`Listening on port ${PORT}`});