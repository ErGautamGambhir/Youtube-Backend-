import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/Apierror.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
//import { json } from "express";
import jwt from "jsonwebtoken";
//import jsonwebtoken from "jsonwebtoken";
// import { upload } from "../middlewares/multer.middlewares.js";

const generateAccessandRefreshTokens = async(userid)=>{
   try {
      const user =  await User.findById(userid);
      const accessToken= user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave : false}) // "Save this document without running schema validation checks first."

      return {accessToken, refreshToken};
   } catch (error) {
       throw new ApiError(500, "somthing went wrong while generating refresh and access token")
   }
}

// for signup
const registerUser = asyncHandler( async(req,res)=>{
    // get user details from fronted 
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatara
    // upload them to cloudinary, avatar
    // create user object- create entry in db
    // remove password and refresh token field from response
    // check for user creation or not
    // return response

    const {fullname,email,username,password} = req.body
    //console.log("email: ", email)
    // if(fullname ==="") throw new ApiError(400, "fullname is required")
    //  [fullname,email,password,username]?.some(field => field.trim === "");
    //console.log(req.body)

    if(
        [fullname,email,password,username].some(field => field?.trim() === "")  // it will return true or false
    ){
        throw new ApiError(400, "All fields are required")
    }

   // email.includes("@nsec.ac.in")
    
    // if( !email.includes("@nsec.ac.in")){
    //     throw new ApiError(400,"enter real email")
    // }
   
   const existedUser = await User.findOne(
        {
            $or : [ {username},{email} ]
        }
    )
   //console.log(req.files)
    if(existedUser){
        throw new ApiError(409,"user with username and email already existed");
    }

  const avatarLocalPath =  req.files?.avatar[0]?.path;
 // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
     coverImageLocalPath = req.files.coverImage[0].path ;
  }
  

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar required ");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400,"avatar file is required")
  }

  const user = await User.create({
    fullname,
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  // Retrieve user and exclude sensitive fields
  const createdUser = await User.findById(user._id).select(
    // kya kya nhi chaiye
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "somthing went wrong while registring user")
  }
  
  return res.status(201).json(
    new ApiResponse(200, createdUser,"User registered successfully")
  )



})

// for login
const loginUser = asyncHandler ( async(req,res)=>{
  // request .body se data aayega, like email, username, password
  // check whether the username/email with password is available or not
  // refreshToken and accessToken generation
  // send cookie

  const {username,email,password}= req.body;

  if(!(username || email)){
    throw new ApiError(400, "username or email is required ")
  }
   
  const user = await User.findOne({
     $or : [{username},{email}]
  })

  if(!user){
    throw new ApiError(404,"user does not exist")
  }

 const isPasswordvalid = await user.isPasswordCorrect(password);

 if(!isPasswordvalid){
    throw new ApiError(401,"password invalid")
  }

 const {accessToken, refreshToken} = await generateAccessandRefreshTokens(user._id);

 const loggedInUser = await User.findById(user._id).select(
  "-password -refreshToken"
 )

 // only modified in server side
 const options = {
  httponly : true,
  secure : true
 }

 return res.status(200)
 .cookie("accessToken", accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
  new ApiResponse(
    200,
    { // data
      user : loggedInUser,
      accessToken,
      refreshToken
    },
    "User logged In successfully"
  )
 )



})

// for logout
const logoutUser = asyncHandler( async(req,res) => {
  // clear cookies 
  // clear ffrefresh Token
await User.findByIdAndUpdate(
  req.user._id,
  {
    $set: {
      refreshToken : undefined
    }
  },
  {
    new : true
  }
 )

 const options = {
  httponly : true,
  secure : true
 }

 return res
 .status(200)
 .clearCookie("accessToken", options)
 .clearCookie("refreshToken",options)
 .json(new ApiResponse(200,{},"user logedout successfully"))
  

})

// Refresh Access Token
const refreshAccessToken = asyncHandler ( async(req,res) => {

 const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

 if(!incomingRefreshToken){
  throw new ApiError(401, "unauthorized request")
 }
try {
  
    const decodedToken= jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  )
  
  const user = await User.findById(decodedToken?._id)
  
  if(!user){
    throw new ApiError(401," invalid refresh token")
  }
  
  if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(401, "Refresh Token is expired or used")
  }
  
  const options = {
    httponly: true,
    secure : true
  }
  
  const {accessToken, newrefreshToken} = await generateAccessandRefreshTokens(user._id)
  
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", newrefreshToken, options)
  .json(
    new ApiResponse(
      200,
      {accessToken,refreshToken: newrefreshToken},
      "Access token refreshed"
    )
  )
  
} catch (error) {
   throw new ApiError(401,error?.message || "invalid refresh token")
}
   
})
 

const changeCurrentPassword = asyncHandler ( async(req, res)=>{
  const {oldPassword,newPassword} = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid old password" )
  }

  user.password = newPassword
  await user.save({validateBeforeSave : false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "password is changed"))
})

const getCurrentUser = asyncHandler ( async ( req, res) =>{
  return res
  .status(200)
  .json(200, req.user, " Current user is fetched successfully")
})

const updateAccountDetails = asyncHandler ( async( req,res) =>{
  const { fullname, email}= req.body

  if(!fullname || !email){
    throw new ApiError(400, " all fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set : {
          fullname : fullname,
          email: email
        }
    },
    {new : true} // update hone ke baad vala information
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account details successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400," Avatar file is missing")
    }

    // todo delete old image- assignment
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
      throw new ApiError(400, " Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
          avatar : avatar.url
         }
      },
      {new : true}
    ).select("-password")
    

    return res
    .status(200)
    .json(new ApiResponse(200,user,"updated"))

     
})

// cover image updation
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400," Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
      throw new ApiError(400, " Error while uploading on Cover Imagef")
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
          coverImage: coverImage.url
         }
      },
      {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"updated"))

     
})

//
const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params 

    if(!username?.trim()){
      throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
      {
        $match: {
            username: username?.toLowerCase()
        }
      },
      { // who subscribed me, yha pe muje subscriber chaiye
        $lookup: {
             from: "subscriptions",
             localField:"_id",
             foreignField:"channel",
             as:"subscribers"
        }
      },
      {// whom i subscribed, maine kitno ko subscribe kiya hai 
        $lookup: {
             from: "subscriptions",
             localField:"_id",
             foreignField:"subscriber",
             as:"subscribedTo"
        }
      },
      {
        $addFields:{
          subscribersCount:{
            $size: "$subscribers"
          },
          channelSubscribedToCount:{
            $size:"$subscribedTo"
          },
          isSubscribed:{
              $cond:{
                if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                then: true,
                else: false
              }

          }
        }
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          subscribersCount: 1,
          channelSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1

        }
      }

    ])

    if(!channel?.length){
      throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    )


})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile

}