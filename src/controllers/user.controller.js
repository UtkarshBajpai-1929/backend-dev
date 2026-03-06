import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import { response } from "express";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user = await User.findById(userId);
   const accessToken =  user.generateAccessToken()
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return {accessToken, refreshToken}

  } catch (error) {
    throw new apiError(500, "Something went wrong while generating tokens");
  }
}
const registerUser = asyncHandler( async (req, res)=>{
  //get user details from frontend
  //validation -- not empty 
  //check if user already exist
  //check for images, check for avatar
  //upload them to cloudinary, avatar
  // create user object-- create entry in db
  // remove password and refresh token field from response
  //check for user creation 
  // return response

  //get user details from frontend
  const {fullname,email, username, password}= req.body;

  //validation
  if(
    [fullname, email, username, password].some((field)=>field?.trim() === "")
  ){
    throw new apiError(400, "All fields are required");
  }

  //checking existed user 
  const existedUser = await User.findOne({
    $or: [{ username },{ email }]
  });
  if(existedUser){
    throw new apiError(409, "User already exist")
  }

  //check for image and avatar and uploading 
  const avatarLocalPath = req.files ?.avatar[0]?.path
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){
    throw new apiError(400, "avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!avatar){
    throw new apiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });
  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if(!createdUser){
    throw new apiError(500, "Something went wrong while registering a user")
  }

  return res.status(201).json(
    new apiResponse(200, createdUser, "User registered")
  )
});

const loginUser = asyncHandler(async(req,res)=>{
  //data from req body 
  // username or email
  // find the user 
  // check password
  // access and refresh token 
  // send cookie
  // response successfull login

  const {email, username, password} = req.body;
  if(!(username || email) || !password){
    throw new apiError(400, "username or email is required")
  }
 const user = await User.findOne({
    $or: [{email}, {username}]
  });
  if(!user){
    throw new apiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if(!isPasswordValid){
    throw new apiError(401, "Invalid user creds");
  }
  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options).json(new apiResponse(200, {
    user: loggedInUser, accessToken, refreshToken
  }, "User logged in successfully"))
});

const logoutUser = asyncHandler(async(req,res)=>{
  const user  = await User.findByIdAndUpdate(req.user._id,{
    $set:{
      refreshToken: undefined
    }
  })
    const options = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new apiResponse(200, {},"User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
 const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken;
 if(!incomingRefreshToken){
  throw new apiError(401, "Unauthorised request")
 }
try {
   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
   const user = await User.find(decodedToken?._id);
   if(!user){
    throw new apiError(401, "Invalid refresh token");
   }
   if(incomingRefreshToken !== user?.refreshToken){
    throw new apiError(401, "Refresh token is expired")
   }
   const options = {
    httpOnly: true,
    secure: true
   }
   const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id);
   return res.status(200).cookie("accessToken", accessToken)
   .cookie("refreshToken", newrefreshToken)
   .cookie("accessToken", accessToken)
   .json(new apiResponse(200, {accessToken, newrefreshToken}, "Access token refreshed"))
} catch (error) {
  throw new apiError(401, error.message);
}
});

const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword} = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect){
    throw new apiError(401, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({validateBeforeSave: false});
  return res.status(200).json(new apiResponse(200, {}, "password changed successfully"));
});
const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status.json(new apiResponse(200, req.user, "current user fetched"))
});
const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullname, email} = req.body;
  if(!fullname || !email){
    throw new apiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname,
        email,
      }
    },
    {new:true}
  ).select("-password");
  return res.status(200).json(new apiResponse(200, user, "Account details updated"));
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalPath = req.file?.path;
   if(!avatarLocalPath){
    throw new apiError(400, "avatar file is missing");
   }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new apiError(400, "Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set:{
      avatar : avatar.url
    }
  },{
    new:true
  }).select("-password")
  return res.status(200).json(new apiResponse(200, user, "avatar uploaded successfully"))
});
const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath){
    throw new apiError(400, "cover image is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage.url){
    throw new apiError(401, "error while uploadin cover image");
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set:{
      coverImage: coverImage.url
    }
  }, {new: true}).select("-password");

  return res.status(200).json(new apiResponse(201, user, "Cover image updated successfully"))
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
};