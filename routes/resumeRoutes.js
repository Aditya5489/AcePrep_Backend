const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadDocMiddleware');
const {
  analyzeResume,
  getResumeHistory,
  getResumeById,
  deleteResume,
  downloadReport
} = require('../controllers/resumeController');


router.use(protect);
router.post('/analyze', upload.single('resume'), analyzeResume);
router.get('/history', getResumeHistory);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);
router.get('/:id/report', downloadReport);

module.exports = router;