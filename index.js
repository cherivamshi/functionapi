const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

// Initialize Firebase Admin SDK
const admin = require('firebase-admin');
admin.initializeApp();

// Initialize Express app
const app = express();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// Configure CORS
app.use(cors({ origin: true }));

// Convert image data to GoogleGenerativeAI.Part
function imageToGenerativePart(imageData, mimeType) {
  return {
    inlineData: {
      data: imageData.toString('base64'),
      mimeType,
    },
  };
}

// API endpoint to receive image data
app.post('/extract-data', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const prompt = 'extract data in the image...';  // Your prompt here

    const imageParts = [imageToGenerativePart(req.file.buffer, req.file.mimetype)];

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY); // Use environment variable
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = await response.text();

    res.json({ data: text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Export Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
