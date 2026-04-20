const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");
const Resume = require("../models/Resume");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "resumes",
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const extractTextFromBuffer = async (buffer, mimeType) => {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf8");
  }

  throw new Error("Unsupported file format");
};

const analyzeWithAI = async (resumeText, jobDescription = "") => {
  const prompt = `
Analyze this resume and return ONLY valid JSON.

Resume:
${resumeText}

${jobDescription ? `Job Description: ${jobDescription}` : ""}

Return format:
{
  "score": 85,
  "summary": "Short summary",
  "strengths": ["","","",""],
  "improvements": ["","","","",""],
  "keywordMatch": {
    "technical": 80,
    "soft": 75,
    "industry": 70
  },
  "sections": {
    "contact": {"status":"good","message":"ok"},
    "summary": {"status":"missing","message":"add summary"},
    "experience": {"status":"needs-work","message":"improve bullets"},
    "education": {"status":"good","message":"ok"},
    "skills": {"status":"good","message":"ok"},
    "projects": {"status":"needs-work","message":"add impact"}
  },
  "suggestions": [
    {
      "title":"Improve Project Section",
      "description":"Use metrics",
      "example":"Built React app used by 100+ users"
    }
  ]
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192",
    messages: [
      {
        role: "system",
        content: "Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,
  });

  const rawText = completion.choices[0].message.content;

  const cleanedText = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleanedText);
};

const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userId = req.user.id;
    const { jobDescription } = req.body;

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      public_id: `resume_${Date.now()}`,
      tags: [`user_${userId}`],
    });

    const resumeText = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype
    );

    const analysis = await analyzeWithAI(resumeText, jobDescription);

    const resume = new Resume({
      user: userId,
      fileName: req.file.originalname,
      fileUrl: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      analysis,
      jobDescription: jobDescription || null,
    });

    await resume.save();

    res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error("Resume Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getResumeHistory = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch resume history' 
    });
  }
};


const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        message: 'Resume not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get Resume Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch resume' 
    });
  }
};


const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        message: 'Resume not found' 
      });
    }

    if (resume.cloudinaryId) {
      await cloudinary.uploader.destroy(resume.cloudinaryId, {
        resource_type: 'raw'
      });
    }

    await resume.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete Resume Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete resume' 
    });
  }
};


const downloadReport = async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        message: 'Resume not found' 
      });
    }

    const html = generateReportHTML(resume);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=resume-analysis-${resume._id}.html`);
    res.send(html);

  } catch (error) {
    console.error('Download Report Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate report' 
    });
  }
};


const generateReportHTML = (resume) => {
  const analysis = resume.analysis;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Resume Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; }
        .score { font-size: 48px; font-weight: bold; color: #0ea5e9; text-align: center; margin: 20px 0; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .strength { color: #10b981; margin: 5px 0; }
        .improvement { color: #f59e0b; margin: 5px 0; }
        .suggestion { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .keyword-bar { height: 20px; background: #e5e7eb; border-radius: 10px; margin: 10px 0; }
        .keyword-fill { height: 100%; background: linear-gradient(to right, #0ea5e9, #3b82f6); border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>Resume Analysis Report</h1>
      <p>File: ${resume.fileName}</p>
      <p>Date: ${new Date(resume.createdAt).toLocaleDateString()}</p>
      
      <div class="score">${analysis.score}/100</div>
      <p>${analysis.summary}</p>
      
      <div class="section">
        <h2>Strengths</h2>
        ${analysis.strengths.map(s => `<div class="strength">✓ ${s}</div>`).join('')}
      </div>
      
      <div class="section">
        <h2>Areas for Improvement</h2>
        ${analysis.improvements.map(i => `<div class="improvement">⚠ ${i}</div>`).join('')}
      </div>
      
      <div class="section">
        <h2>Keyword Match</h2>
        <div>Technical: ${analysis.keywordMatch.technical}%</div>
        <div class="keyword-bar"><div class="keyword-fill" style="width: ${analysis.keywordMatch.technical}%"></div></div>
        <div>Soft Skills: ${analysis.keywordMatch.soft}%</div>
        <div class="keyword-bar"><div class="keyword-fill" style="width: ${analysis.keywordMatch.soft}%"></div></div>
        <div>Industry: ${analysis.keywordMatch.industry}%</div>
        <div class="keyword-bar"><div class="keyword-fill" style="width: ${analysis.keywordMatch.industry}%"></div></div>
      </div>
      
      <div class="section">
        <h2>AI Suggestions</h2>
        ${analysis.suggestions.map(s => `
          <div class="suggestion">
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <p><strong>Example:</strong> ${s.example}</p>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  analyzeResume,
  getResumeHistory,
  getResumeById,
  deleteResume,
  downloadReport
};