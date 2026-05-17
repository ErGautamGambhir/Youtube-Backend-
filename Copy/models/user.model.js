import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(

    {
        username:{
            type : String,
            required : true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true  // searching field releted hai in database
        } ,
        email:{
            type : String,
            required : true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type : String,
            required : true,
            trim: true,
            index: true
        },
        avatar:{
            type: String, //cloudinary url
            required: true,
        },
        coverImage:{
            type: String, //cloudinary url
        
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type : String,
            required: [true,'password is required']
        },
        refreshToken:{
            type: String,

        }

    },
     {timestamps:true}
);

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)
    next()
    // next() This tells Mongoose:
   // “I’m done with my async work (i.e., hashing). Now go ahead and save the document.
})

userSchema.methods.isPasswordCorrect = async function(password){
    //bcrypt.compare() internally handles the hashing and comparison for you.
   return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){

    // generate token
 return jwt.sign(
        {   // payload
            _id: this._id,
            email : this.email,
            username: this.username,
            fullname:this.fullname
        },
        // secret
        process.env.ACCESS_TOKEN_SECRET,
        {
            //options
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken= function(){
     return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )

}

export const User = mongoose.model("User",userSchema)