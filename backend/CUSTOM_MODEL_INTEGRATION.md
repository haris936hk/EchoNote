# Custom Model Integration Guide

This guide explains how to integrate your fine-tuned EchoNote model with the Express backend.

## 📚 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Setup Instructions](#setup-instructions)
3. [Integration Example](#integration-example)
4. [Switching Between Providers](#switching-between-providers)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

---

## 📋 Architecture Overview

### Original Pipeline (Groq API)
```
Audio → Optimization → Whisper → SpaCy NLP → Groq API → Summary
```

### New Pipeline (Custom Model)
```
Audio → Optimization → Whisper → SpaCy NLP → Custom Model API → Summary
```

### Service Architecture
```
meetingController.js
    ↓
processingService.js
    ↓
summarizationService.js  (Abstraction Layer)
    ↓
┌─────────────┬─────────────────┐
│             │                 │
groqService   customModelService
(Mistral-7B)  (Fine-tuned Qwen2.5-7B)
```

---

## 🚀 Setup Instructions

### Step 1: Start the Inference Notebook

1. Open `echonote_inference_api_ngrok.ipynb` in Google Colab
2. Run all cells in order (1-14)
3. Copy the NGROK public URL from the output
4. Save the API key shown in the output

### Step 2: Configure Environment Variables

Update your `.env` file:

```bash
# Select your provider
SUMMARIZATION_PROVIDER=custom  # or 'groq'

# Enable fallback to Groq if custom model fails
ENABLE_SUMMARIZATION_FALLBACK=true

# Custom Model Configuration
CUSTOM_MODEL_API_URL=https://your-actual-domain.ngrok-free.app
CUSTOM_MODEL_API_KEY=echonote-secret-api-key-2025
CUSTOM_MODEL_TIMEOUT=70000

# Groq Configuration (for fallback)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=mixtral-8x7b-32768
```

### Step 3: Install Dependencies

No new dependencies needed! The services use existing packages:
- `axios` (already installed)
- `winston` (your logger)

### Step 4: Verify Setup

```bash
cd backend
npm run dev
```

Check logs for:
```
[Summarization] Service initialized { provider: 'custom', fallbackEnabled: true }
```

---

## 🔧 Integration Example

### Option A: Update Existing Processing Service

If you already have a `processingService.js`, update it to use the new abstraction:

```javascript
// backend/src/services/processingService.js

const summarizationService = require('./summarizationService');
const logger = require('../utils/logger');

async function processMeeting(meetingId, audioPath) {
  try {
    // ... existing audio optimization code ...

    // Step 1: Transcribe with Whisper
    const transcriptResult = await transcribeAudio(audioPath);
    if (!transcriptResult.success) {
      throw new Error('Transcription failed');
    }

    // Step 2: Extract NLP features with SpaCy
    const nlpResult = await extractNLPFeatures(transcriptResult.data.text);
    if (!nlpResult.success) {
      logger.warn('NLP extraction failed, continuing without features');
    }

    // Step 3: Generate summary (uses configured provider)
    const summaryResult = await summarizationService.generateSummary(
      transcriptResult.data.text,
      nlpResult.success ? nlpResult.data : null
    );

    if (!summaryResult.success) {
      throw new Error(`Summarization failed: ${summaryResult.error}`);
    }

    // Step 4: Save to database
    await saveMeetingResults(meetingId, {
      transcript: transcriptResult.data.text,
      summary: summaryResult.data,
      nlpFeatures: nlpResult.data
    });

    return { success: true, data: summaryResult.data };

  } catch (error) {
    logger.error('[Processing] Pipeline failed', { error: error.message });
    return { success: false, error: error.message };
  }
}
```

### Option B: Create New Processing Function

Add this to your `processingService.js`:

```javascript
const summarizationService = require('./summarizationService');

/**
 * Process meeting with custom model
 */
async function processMeetingWithCustomModel(meetingId, audioPath) {
  // Temporarily switch to custom model
  const originalProvider = summarizationService.provider;
  summarizationService.switchProvider('custom');

  try {
    const result = await processMeeting(meetingId, audioPath);
    return result;
  } finally {
    // Restore original provider
    summarizationService.switchProvider(originalProvider);
  }
}

module.exports = {
  processMeeting,
  processMeetingWithCustomModel
};
```

---

## 🔄 Switching Between Providers

### Method 1: Environment Variable (Permanent)

Edit `.env`:
```bash
SUMMARIZATION_PROVIDER=custom  # or 'groq'
```

Restart server:
```bash
npm run dev
```

### Method 2: Runtime Switch (A/B Testing)

Create an admin endpoint:

```javascript
// backend/src/routes/admin.routes.js

const express = require('express');
const router = express.Router();
const summarizationService = require('../services/summarizationService');
const { authenticateToken, isAdmin } = require('../middleware/auth');

/**
 * GET /api/admin/summarization/config
 * Get current summarization configuration
 */
router.get('/summarization/config', authenticateToken, isAdmin, (req, res) => {
  try {
    const config = summarizationService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/summarization/switch
 * Switch summarization provider
 */
router.post('/summarization/switch', authenticateToken, isAdmin, (req, res) => {
  try {
    const { provider } = req.body;

    if (!['groq', 'custom'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "Provider must be 'groq' or 'custom'"
      });
    }

    summarizationService.switchProvider(provider);

    res.json({
      success: true,
      message: `Switched to ${provider} provider`,
      data: summarizationService.getConfig()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/summarization/health
 * Check health of current provider
 */
router.get('/summarization/health', authenticateToken, isAdmin, async (req, res) => {
  try {
    const health = await summarizationService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### Method 3: Per-Request Provider Selection

Modify your meeting controller to accept a provider parameter:

```javascript
// backend/src/controllers/meeting.controller.js

async function uploadMeeting(req, res) {
  try {
    const { provider } = req.query; // Optional: ?provider=custom

    // Temporarily switch if specified
    if (provider && ['groq', 'custom'].includes(provider)) {
      const originalProvider = summarizationService.provider;
      summarizationService.switchProvider(provider);

      // Process meeting
      const result = await processMeeting(meetingId, audioPath);

      // Restore original
      summarizationService.switchProvider(originalProvider);

      return res.json(result);
    }

    // Use default provider
    const result = await processMeeting(meetingId, audioPath);
    res.json(result);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 🧪 Testing the Integration

### Test 1: Health Check

```bash
# Check if custom model API is reachable
curl http://localhost:5000/api/admin/summarization/health \
  -H "Authorization: Bearer your-jwt-token"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "model": "haris936hk/echonote",
    "uptime": 3456.78
  }
}
```

### Test 2: Single Meeting Processing

```bash
# Upload a meeting using custom model
curl -X POST http://localhost:5000/api/meetings?provider=custom \
  -H "Authorization: Bearer your-jwt-token" \
  -F "audio=@test-meeting.wav" \
  -F "title=Test Meeting" \
  -F "category=STANDUP"
```

### Test 3: Compare Providers

```javascript
// backend/tests/compare-providers.js

const summarizationService = require('../src/services/summarizationService');
const fs = require('fs');

async function compareProviders() {
  const transcript = fs.readFileSync('sample-transcript.txt', 'utf8');
  const nlpFeatures = { /* your NLP data */ };

  // Test Groq
  summarizationService.switchProvider('groq');
  const groqResult = await summarizationService.generateSummary(transcript, nlpFeatures);
  console.log('Groq Result:', JSON.stringify(groqResult, null, 2));

  // Test Custom Model
  summarizationService.switchProvider('custom');
  const customResult = await summarizationService.generateSummary(transcript, nlpFeatures);
  console.log('Custom Result:', JSON.stringify(customResult, null, 2));

  // Compare
  console.log('\n=== Comparison ===');
  console.log('Groq action items:', groqResult.data?.actionItems?.length || 0);
  console.log('Custom action items:', customResult.data?.actionItems?.length || 0);
}

compareProviders().catch(console.error);
```

Run:
```bash
node backend/tests/compare-providers.js
```

---

## 🐛 Troubleshooting

### Issue 1: Connection Timeout

**Symptom**: `Custom model API failed after 3 attempts: timeout of 70000ms exceeded`

**Solutions**:
1. Check if NGROK tunnel is still active (tunnels expire after 2 hours on free tier)
2. Restart the inference notebook
3. Update `CUSTOM_MODEL_API_URL` in `.env`
4. Increase timeout: `CUSTOM_MODEL_TIMEOUT=120000`

### Issue 2: API Key Authentication Failed

**Symptom**: `Invalid or missing API key`

**Solutions**:
1. Verify `CUSTOM_MODEL_API_KEY` matches notebook configuration (cell 4)
2. Check for typos in API key
3. Ensure key doesn't have trailing spaces

### Issue 3: Model Returns Invalid JSON

**Symptom**: `Failed to parse model output as JSON`

**Solutions**:
1. Fine-tuning might need improvement
2. Enable fallback: `ENABLE_SUMMARIZATION_FALLBACK=true`
3. Check notebook logs for model errors
4. Test with shorter transcripts first

### Issue 4: Groq Fallback Not Working

**Symptom**: Both providers fail

**Solutions**:
1. Verify `GROQ_API_KEY` is valid
2. Check Groq API status: https://status.groq.com
3. Review logs for specific error messages

### Issue 5: NGROK URL Changes on Restart

**Symptom**: API works, then stops after notebook restart

**Solutions**:
1. Get a static NGROK domain (free tier includes 1)
2. Update notebook cell 12: `NGROK_STATIC_DOMAIN = "your-echonote.ngrok-free.app"`
3. Or use a script to auto-update `.env`:

```bash
# auto-update-ngrok-url.sh
NEW_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
sed -i "s|CUSTOM_MODEL_API_URL=.*|CUSTOM_MODEL_API_URL=$NEW_URL|" .env
echo "Updated URL to: $NEW_URL"
```

---

## 📊 Performance Comparison

Expected performance characteristics:

| Metric | Groq API | Custom Model |
|--------|----------|--------------|
| Latency | ~3-5s | ~5-8s |
| Accuracy | Good (generic) | Better (fine-tuned) |
| Cost | API credits | Free (GPU compute) |
| Uptime | 99.9% | Depends on notebook |
| Scalability | High | Limited (single GPU) |

**Recommendation**: Use custom model for testing/validation, switch to Groq for production reliability.

---

## 🚀 Production Deployment

For production, migrate from NGROK to proper hosting:

### Option 1: HuggingFace Inference Endpoints
```bash
# Deploy your model
huggingface-cli endpoint create \
  --model haris936hk/echonote \
  --instance-type g4dn.xlarge

# Update .env
CUSTOM_MODEL_API_URL=https://your-endpoint.aws.endpoints.huggingface.cloud
```

### Option 2: Modal.com
```python
# modal_deploy.py
import modal

stub = modal.Stub("echonote-inference")

@stub.function(gpu="T4", timeout=60)
def predict(transcript: str):
    # Your inference code
    pass

@stub.asgi(image=your_image)
def web():
    from fastapi import FastAPI
    app = FastAPI()
    # Your API endpoints
    return app
```

### Option 3: Self-hosted
- Deploy FastAPI server on AWS/GCP with GPU instance
- Use NGINX as reverse proxy
- Add proper SSL certificates
- Implement auto-scaling

---

## 📞 Support

If you encounter issues:

1. Check logs: `tail -f backend/logs/echonote.log`
2. Test health endpoint: `GET /api/admin/summarization/health`
3. Verify NGROK tunnel: Visit `http://localhost:4040` (NGROK inspector)
4. Review notebook output for model errors

**Debug Mode**:
```bash
LOG_LEVEL=debug npm run dev
```

This will show detailed request/response data for troubleshooting.
