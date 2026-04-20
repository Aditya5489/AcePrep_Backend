const express= require("express");
const {registerUser,loginUser,getUserProfile}=require("../controllers/authController");
const {protect}=require("../middlewares/authMiddleware");
const upload=require("../middlewares/uploadImageMiddleware");
const cloudinary = require("../config/cloudinary");

const router=express.Router();

router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/profile",protect,getUserProfile);



router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "profile_pics",
          transformation: [
            { width: 300, height: 300, crop: "fill" },
            { quality: "auto" }
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    res.status(200).json({
      imageUrl: result.secure_url,
      public_id: result.public_id
    });

  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});


module.exports=router;