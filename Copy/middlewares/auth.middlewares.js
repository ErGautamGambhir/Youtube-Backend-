import { ApiError } from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const  verifyJWT = asyncHandler(async (req, res, next) => {
   try {
     const token = req.cookies?.accessToken || req.header("Autherization")?.replace("Bearer ", "");
 
     if(!token){
         throw new ApiError(401, "unauthorized request")
     }
 
    const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   
    //{ _id: "64abc123", username: "gauti" }but 
    const user = await User.findById(decodedToken?._id).select(
     "-password -refreshToken"
    )
 
    if(!user){
     throw new ApiError(401, "invalid Access token")
    }
 
    req.user = user;  //Both user and req.user point to the exact same object in memory.
    next()
 
   } catch (error) {
       throw new ApiError(401, " Invalid access token")
   }

})