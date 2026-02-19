require("dotenv").config();
const express= require("express");
const cors=require("cors");
const path=require("path");
const app=express();
const connectDB=require('./config/db');

const authRoutes=require("./routes/authRoutes");
const sessionRoutes=require("./routes/sessionRoutes");
const questionRoutes=require("./routes/questionRoutes");
const resumeRoutes=require('./routes/resumeRoutes')

const {protect}=require("./middlewares/authMiddleware");
const {generateInterviewQuestions,generateConceptExplaination}=require("./controllers/aiController");

app.use(cors({
    origin:"*",
    method:['GET','POST','PUT','DELETE'],
    allowHeaders:['Content-Type','Authorization']
}));

connectDB();

app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api/questions",questionRoutes);
app.use("/api/sessions",sessionRoutes);
app.use('/api/resume', resumeRoutes);


app.post("/api/ai/generate-questions",protect,generateInterviewQuestions);
app.post("/api/ai/generate-explanation",protect,generateConceptExplaination);



const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));