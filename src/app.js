import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();


// (.use) for  middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials : true

}))
 // middleware,  configuration
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true,limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser())


//routes
// because default export of router
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users",userRouter)



export { app }