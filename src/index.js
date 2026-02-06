// require ('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import mongoose from "mongoose";
import connectDB from "./db/index.js";
connectDB();
dotenv.config({
  path: './env'
})





/*
import express, { application } from "express";
const app = express;
(async ()=>{
  try {
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error)=>{
      console.log('ERR: ', error)
    })
    app.listen(process.env.PORT, ()=>{
      console.log("app is listening on: ", process.env.PORT)
    })
  } catch (error) {
    console.error(error);
  }
})()
  */