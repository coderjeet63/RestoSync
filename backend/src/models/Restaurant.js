import mongoose from 'mongoose'

const restaurantSchema = new mongoose.Schema({

     name :{
        type : String ,
        required : true ,
        index : true
     },

     location :{
        type : String ,
        required : true
     },

     isActive :{
        type : Boolean ,
        default : true
     }
}, {
    timestamps : true
})

export const Restaurant = mongoose.model('Restaurant', restaurantSchema)
