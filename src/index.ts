import express from "express";
import router from "./routes/router.ts";
const app = express();

app.use(express.json());
app.use(express.urlencoded());



app.use("/",router);

app.listen(3000,()=>{
    console.log("app en marcha en el puerto 3000");
})

