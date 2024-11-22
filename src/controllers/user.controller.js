import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefereshTokens = async(userId)=>{
  try {
   const user= await User.findById(userId)
   const accessToken=user.generateAccessToken()
   const refreshToken =user.generateRefreshToken()

 user.refreshToken= refreshToken
 await user.save({validateBeforeSave:false})

 return{accessToken,refreshToken}

  } catch (error) {
     throw new ApiError(500,"something went wrong while generating referesh and access token")
  }
}


const registerUser = asyncHandler (async (req ,res) =>{
//    get user details from front end
//    validation-not empty
//    check if user already exists : username,email
//    check for images,check for avatar
//    upload them to cloudinary,avatar
//    create user object-create entry in db
//    remove password & refresh token feild from response 
//    check for user creation
//    return  response
    
   const {fullName,username,email,password}=req.body
   //console.log("email: ",email);
   

   if (
    [fullName,email,username,password].some((field)=>field?.trim()==="")
     )
   {
    throw new ApiError(400,"all feilds are required")
   }
   const existedUser = await User.findOne({
    $or:[{username},{email}]
   })
   if (existedUser){
    throw new ApiError(409,"user with email or username already exists")
   }
   const avatarLocalPath = req.files?.avatar[0]?.path;
   //const coverImageLocalPath=req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if (req.files&&Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
    coverImageLocalPath =req.files.coverImage[0].path
   }

   if(!avatarLocalPath){
    throw new ApiError (400,"avatar file is required")
   }

    const avatar =await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
   
    if(!avatar){
        throw new ApiError (400,"avatar file is required")
    }

   //datbase
    const user =await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url||"",
    email,
    password,
    username:username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500 , "something went wromg while regestering the user")
   }

   return res.status(201).json(
    new ApiResponse (200,createdUser,"User registerd succesfully")
   )


} )

const loginUser = asyncHandler (async (req,res)=>{
     //req body se data le aao
     //username or email le aoo
     //find the user kro
     //paswword check Kro
     //access and refresh token generate krke  dedo
     // send krdo cookies main
     //response bhjdo
     
     const {email,username,password }= req.body
     console.log(email);
     


     if(!username&&!email){
      throw new ApiError (400,"username or email is required")
     }
     
     const user =await User.findOne({
      $or:[{username},{email}]
     })
     
     if(!user){
      throw new ApiError (404,"user does not exist")
     }
   
    const isPasswordValid= await user.isPasswordCorrect(password)
     
    if(!isPasswordValid){
      throw new ApiError (401,"Invali user credentials")
     }

    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)

   const loggedInUser= User.findById(user._id).select("-password -refreshToken")


   const options = {
    httpOnly:true,
    secure:true
   }

   return res.status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,
      {
        user:loggedInUser,accessToken,refreshToken
      },
      "User Loged In Succesfully"
    )
   )
})

const logoutUser = asyncHandler(async(req,res)=>{
  User.findByIdAndUpdate
  (
   req.user._id,{
    $set:{
      refreshToken:undefined
    }
   },{
    new:true
   }
  )
  const options = {
    httpOnly:true,
    secure:true
   }
   return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"user logged out"))

})

const refreshAcessToken = asyncHandler(async(req2,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401,"unauthorized request")
  }
 try {
   const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
   )
 
  const user = await User.findById(decodedToken?._id)
  if(!user){
   throw new ApiError(401,"invalid refresh token")
  }
 if (incomingRefreshToken !==user?.refreshToken) {
   throw new ApiError(401,"Refresh token is expired or used");
 }
 
 const options = {
   httpOnly:true,
   secure:true
 }
 
 const {accessToken,newRefreshToken}= await generateAccessAndRefereshTokens(user._id)
 
 
 return res 
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",newRefreshToken,options)
 .json(
   new ApiResponse(
     200,
     {accessToken,refreshToken:newRefreshToken},
     "access token refreshed"
   )
 )
 
 } catch (error) {
   throw new ApiError(401, error?.message ||"Invalid refresh token")
 }
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken
}