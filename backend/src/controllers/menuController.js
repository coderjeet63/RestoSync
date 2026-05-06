
import redis from '../config/redis.js'
import mongoose from 'mongoose'

const getMenu =  async(req, res) => {
     
     try {

         if(!req.params.id) {
             return res.status(400).json({ message: 'Menu ID is required' })
         }
               if(!redis) {
                   return res.status(500).json({ message: 'Redis is not connected' })
               }
               
          const menu = await redis.get(`menu:${req.params.id}`)
                if(!menu)
                { 
                 const menu =  await mongoose.findById(req.params.id)
                 await redis.set(`menu:${req.params.id}`, JSON.stringify(menu))
                 return res.status(200).json({ menu })
                }
              
     } catch (error) {
          return res.status(500).json({ message: error.message })
     }
}