const User= require('../models/User');
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken');

const generateToken= (userId)=>{
    return jwt.sign({userId},process.env.JWT_SECRET,{expiresIn:'7d'});
}

const registerUser = async (req, res) => {
  try {
    const { name, email, password ,profilePic} = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profilePic: profilePic||""
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      token: generateToken(user._id)
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body;
        const user= await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"Invalid credentials"});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
        }
        res.json({
            _id:user._id,
            name:user.name,
            email:user.email,
            profilePic:user.profilePic,
            token:generateToken(user._id)
        })
        
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message});

    }
}

const getUserProfile=async(req,res)=>{
    try {
        const user=await User.findById(req.user._id).select("-password");
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        res.json(user);
        
    } catch (error) {
        res.status(500).json({message:"Server error",error:error.message});
    }

}

module.exports={registerUser,loginUser,getUserProfile};