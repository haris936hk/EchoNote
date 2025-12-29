# Quick Start: Custom Model Integration

## 🚀 5-Minute Setup

### Step 1: Start Inference Notebook (Google Colab)

1. Open `echonote_inference_api_ngrok.ipynb` in Google Colab
2. Run **all cells** in order (Cells 1-14)
3. Copy the NGROK URL from the output:
   ```
   🌐 Public URL: https://abc123.ngrok-free.app
   ```

### Step 2: Configure Backend

Update your `.env` file:

```bash
# Switch to custom model
SUMMARIZATION_PROVIDER=custom

# Paste your NGROK URL here
CUSTOM_MODEL_API_URL=https://abc123.ngrok-free.app

# API key from notebook (default)
CUSTOM_MODEL_API_KEY=echonote-secret-api-key-2025

# Enable fallback to Groq if custom model fails
ENABLE_SUMMARIZATION_FALLBACK=true

# Your Groq API key (for fallback)
GROQ_API_KEY=your-groq-api-key-here
```

### Step 3: Add Admin Routes

In `backend/src/server.js` or `backend/src/app.js`, add:

```javascript
// Import admin routes
const adminRoutes = require('./routes/admin.routes');

// Mount admin routes
app.use('/api/admin', adminRoutes);
```

### Step 4: Start Backend

```bash
cd backend
npm run dev
```

Check logs for:
```
[Summarization] Service initialized { provider: 'custom', fallbackEnabled: true }
```

### Step 5: Test Integration

```bash
# Run automated test suite
node tests/test-custom-model-integration.js
```

Or test manually:

```bash
# Check health
curl http://localhost:5000/api/admin/summarization/health

# Get config
curl http://localhost:5000/api/admin/summarization/config

# Test with sample transcript
curl -X POST http://localhost:5000/api/admin/summarization/test \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Meeting about Q3 results. Revenue hit $2.5M. Action items: Mike will complete mobile redesign by Friday."}'
```

---

## 📊 Quick Commands Reference

### Check Status
```bash
# View current provider
curl http://localhost:5000/api/admin/summarization/config

# Health check
curl http://localhost:5000/api/admin/summarization/health

# Check all providers
curl http://localhost:5000/api/admin/summarization/health/all
```

### Switch Providers
```bash
# Switch to custom model
curl -X POST http://localhost:5000/api/admin/summarization/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "custom"}'

# Switch to Groq
curl -X POST http://localhost:5000/api/admin/summarization/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "groq"}'
```

### Update NGROK URL
```bash
# When NGROK URL changes
curl -X PUT http://localhost:5000/api/admin/summarization/custom-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://new-url.ngrok-free.app"}'
```

### Compare Providers
```bash
# A/B test both providers
curl -X POST http://localhost:5000/api/admin/summarization/compare \
  -H "Content-Type: application/json" \
  -d @sample-transcript.json
```

---

## 🔧 Troubleshooting

### ❌ Connection timeout

**Problem**: `Custom model API failed after 3 attempts`

**Solution**:
1. Check if NGROK tunnel is still running in Colab
2. NGROK free tier sessions expire after 2 hours
3. Restart notebook and update `.env` with new URL

### ❌ Invalid API key

**Problem**: `403 - Invalid or missing API key`

**Solution**:
1. Verify `CUSTOM_MODEL_API_KEY` matches notebook (cell 4)
2. Default key: `echonote-secret-api-key-2025`

### ❌ Model returns invalid JSON

**Problem**: `Failed to parse model output as JSON`

**Solution**:
1. Enable fallback: `ENABLE_SUMMARIZATION_FALLBACK=true`
2. Check model fine-tuning quality
3. Test with shorter transcripts first

### ❌ NGROK bandwidth limit

**Problem**: API stops working mid-day

**Solution**:
1. Free tier: 1GB/month (~1000 requests)
2. Get a paid NGROK plan OR
3. Switch back to Groq: `SUMMARIZATION_PROVIDER=groq`

---

## 📁 Files Created

```
backend/
├── src/
│   ├── services/
│   │   ├── customModelService.js          # Custom model API client
│   │   ├── groqService.js                 # Groq API client
│   │   └── summarizationService.js        # Unified abstraction layer
│   └── routes/
│       └── admin.routes.js                # Admin endpoints for provider management
├── tests/
│   └── test-custom-model-integration.js   # Automated test suite
├── .env.example                           # Updated with new variables
├── CUSTOM_MODEL_INTEGRATION.md            # Full integration guide
└── QUICK_START_CUSTOM_MODEL.md           # This file
```

---

## 🎯 Next Steps

### For Development/Testing:
1. ✅ Test with real meeting data
2. ✅ Compare accuracy: Custom vs Groq
3. ✅ Measure processing times
4. ✅ A/B test with users

### For Production:
1. 🚀 Deploy model to HuggingFace Inference Endpoints OR Modal.com
2. 🔐 Add proper authentication to admin routes
3. 📊 Set up monitoring and alerts
4. 💾 Cache frequent requests
5. ⚖️ Configure auto-scaling

---

## 💡 Pro Tips

1. **Get a static NGROK domain** (free tier includes 1):
   - Update notebook cell 12: `NGROK_STATIC_DOMAIN = "your-echonote.ngrok-free.app"`
   - URL won't change on restart

2. **Auto-update NGROK URL** when it changes:
   ```bash
   # Save as update-ngrok.sh
   NEW_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
   sed -i "s|CUSTOM_MODEL_API_URL=.*|CUSTOM_MODEL_API_URL=$NEW_URL|" .env
   ```

3. **Monitor NGROK tunnel**:
   - Visit `http://localhost:4040` for request inspector
   - See all API calls in real-time

4. **Use fallback wisely**:
   - Set `ENABLE_SUMMARIZATION_FALLBACK=true`
   - If custom model fails, auto-switches to Groq
   - Best of both worlds

5. **Test before switching**:
   - Always test new provider with `/summarization/test`
   - Compare outputs with `/summarization/compare`
   - Only switch after validation

---

## 📖 Full Documentation

For comprehensive details, see:
- [CUSTOM_MODEL_INTEGRATION.md](./CUSTOM_MODEL_INTEGRATION.md) - Complete integration guide
- [echonote_inference_api_ngrok.ipynb](../echonote_inference_api_ngrok.ipynb) - Inference server notebook

---

## 🆘 Need Help?

1. **Check logs**: `tail -f logs/echonote.log`
2. **Enable debug mode**: `LOG_LEVEL=debug npm run dev`
3. **Test health endpoint**: `curl localhost:5000/api/admin/summarization/health`
4. **Run test suite**: `node tests/test-custom-model-integration.js`

**Common Issues**: See [Troubleshooting](#-troubleshooting) section above

---

**Happy Testing! 🎉**
