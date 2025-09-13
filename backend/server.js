const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Multer setup for file uploads (in memory or tmp folder)
const upload = multer({ dest: 'uploads/' });

// Serve the frontend HTML with embedded CSS & JS
const frontendHTML = `
<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Adaptive Learning Platform - Upload Document</title>
  <style>
    /* Your advanced CSS from earlier here, shortened for brevity */
    body {
      font-family: Arial, sans-serif;
      background: #2575fc;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      color: #fff;
    }
    .container {
      background: white;
      color: #34495e;
      padding: 30px;
      border-radius: 20px;
      width: 90%;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      text-align: center;
    }
    input[type=file] {
      padding: 15px;
      width: 80%;
      margin-bottom: 20px;
      border-radius: 10px;
      border: 1px solid #ccc;
    }
    button {
      padding: 12px 24px;
      background-color: #2575fc;
      border: none;
      color: white;
      font-size: 18px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: bold;
    }
    button:disabled {
      background-color: #a0b8ff;
      cursor: not-allowed;
    }
    pre {
      background: #f4f7ff;
      border-radius: 12px;
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 30px;
      text-align: left;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: monospace;
      color: #222;
    }
    #spinner {
      display: none;
      margin-left: 10px;
      border: 4px solid #d6e0f0;
      border-top: 4px solid #2575fc;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1.2s linear infinite;
      vertical-align: middle;
    }
    @keyframes spin {
      0% { transform: rotate(0deg);}
      100% { transform: rotate(360deg);}
    }
    #status {
      margin-top: 20px;
      font-weight: 600;
      min-height: 24px;
      color: #2c3e50;
    }
    #status.error {
      color: red;
    }
    #status.success {
      color: green;
    }
  </style>
</head>
<body>
  <div class="container" role="main" aria-label="Upload your document">
    <h1>Upload Study Document</h1>
    <form id="uploadForm" enctype="multipart/form-data">
      <input type="file" id="fileInput" name="file" accept=".pdf,.txt" aria-label="Choose PDF or TXT file" required />
      <button type="submit">Upload <span id="spinner"></span></button>
    </form>
    <div id="status"></div>
    <pre id="extractedText" tabindex="0" aria-label="Extracted text will appear here"></pre>
  </div>
  <script>
    const form = document.getElementById('uploadForm');
    const status = document.getElementById('status');
    const extractedText = document.getElementById('extractedText');
    const spinner = document.getElementById('spinner');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      extractedText.textContent = '';
      spinner.style.display = 'inline-block';
      form.querySelector('button').disabled = true;

      const fileInput = document.getElementById('fileInput');
      if (!fileInput.files[0]) {
        status.textContent = 'Please select a file!';
        status.className = 'error';
        spinner.style.display = 'none';
        form.querySelector('button').disabled = false;
        return;
      }

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      try {
        const res = await fetch('/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed with status ' + res.status);
        const data = await res.json();
        extractedText.textContent = data.text || 'No text extracted.';
        status.textContent = 'Document processed successfully!';
        status.className = 'success';
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
        status.className = 'error';
      } finally {
        spinner.style.display = 'none';
        form.querySelector('button').disabled = false;
      }
    });
  </script>
</body>
</html>
`;

// Serve frontend at root
app.get('/', (req, res) => {
  res.send(frontendHTML);
});

// Handle file upload and extraction
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = path.resolve(req.file.path);

  try {
    let text = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (req.file.mimetype === 'text/plain') {
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file format, upload PDF or TXT.' });
    }

    fs.unlinkSync(filePath);
    res.json({ text });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
