const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  analysis: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    summary: {
      type: String,
      required: true
    },
    strengths: [String],
    improvements: [String],
    keywordMatch: {
      technical: Number,
      soft: Number,
      industry: Number
    },
    sections: {
      contact: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      },
      summary: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      },
      experience: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      },
      education: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      },
      skills: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      },
      projects: {
        status: {
          type: String,
          enum: ['good', 'missing', 'needs-work']
        },
        message: String
      }
    },
    suggestions: [{
      title: String,
      description: String,
      example: String
    }]
  },
  jobDescription: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


resumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);