// require ('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { app } from './app.js';
dotenv.config({
  path: './env'
});
connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000, ()=>{
    console.log(`server is running on port: ${process.env.PORT}`)
  })
})
.catch((err) => {console.log("Mongodb connection failed...!!!")
});





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