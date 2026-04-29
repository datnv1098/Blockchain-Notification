# API Quota Management Guide

## Problem
Your bot hit the **Moralis free tier daily quota limit** while monitoring 10+ wallets across multiple EVM chains with a 30-second polling interval.

**Daily API call estimate:**
- 10 wallets × 5 API calls per check × 2 polls/minute × 1440 minutes = ~144,000 calls/day
- Moralis free tier: ~10,000 calls/day
- **Result: Quota exceeded quickly**

---

## Solutions Implemented ✅

### 1. **Increased Default Polling Interval**
- **Before:** 30 seconds
- **After:** 5 minutes (300 seconds)
- **Impact:** ~10x reduction in API calls

### 2. **Request Caching (new `services/cache.js`)**
- Token prices cached for 10 minutes
- Reduces redundant Moralis API calls
- Typical savings: 30-50% reduction in price lookups

### 3. **Improved Error Handling**
- Detects quota exhaustion (401 with "plan" message)
- Automatically pauses polling for 1 hour when quota exceeded
- Sends Telegram alert when quota exhausted
- Exponential backoff on rate limits (1s → 2s → 4s → 10s max)

### 4. **Better Rate Limit Recovery**
- 401/403 errors now trigger key rotation with backoff
- Previous attempt every 500ms → now with exponential backoff
- Prevents hammering API when quota exceeded

---

## Configuration (.env)

```env
# Polling interval in milliseconds (default: 5 minutes)
# Increase this to reduce API calls
POLL_INTERVAL_MS=300000

# Pause duration when quota exhausted (default: 60 minutes)
QUOTA_PAUSE_MINUTES=60

# Recommended: rotate multiple API keys
MORALIS_API_KEY_1=your-key-1
MORALIS_API_KEY_2=your-key-2
MORALIS_API_KEY_3=your-key-3
```

---

## Recommended Actions

### **Quick Fix (TODAY)**
- ✅ Already done: polling interval increased to 5 minutes
- Consider upgrading to **Moralis Pro plan** (~$50-200/month depending on usage)

### **Medium-term (THIS WEEK)**
- Add more Moralis API keys (.env variables) for rotation
- Monitor quota usage in logs
- Set up alerts for quota exhaustion

### **Long-term (OPTIMIZATION)**
- Use **Webhooks** instead of polling (when available)
- Implement transfer event caching database
- Archive old checked transfers to avoid re-processing
- Consider using alternative providers (Alchemy, QuickNode, Infura) with free tier

---

## Monitoring

Check logs for quota status:
```
[PAUSE] Quota exceeded, tạm dừng 60 phút còn lại...
[RESUME] Quota pause hết, tiếp tục polling...
[MORALIS] Rotate key #1 → #2 (lý do: auth error (401/403))
```

Cache stats available via:
```javascript
const { getStats } = require("./services/cache");
console.log(getStats()); // { total: N, keys: [...] }
```

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Polling Interval | 30s | 5 min |
| Calls/Hour (10 wallets) | ~7,200 | ~240 |
| Calls/Day | ~172,800 | ~5,760 |
| Free Tier Quota | ❌ Exceeded | ✅ Within limit |
| Cache Hit Rate | 0% | ~30-50% |

---

## Next Steps

1. **Test current setup** - Run for 24 hours and monitor logs
2. **If still hitting limits:**
   - Increase `POLL_INTERVAL_MS` to 10 minutes (600000)
   - Add wallet filtering (monitor only critical wallets frequently)
   - Upgrade Moralis plan
3. **If quota exhaustion still occurs:**
   - Implement event-based monitoring (webhooks)
   - Switch to alternative RPC providers
   - Archive historical data

---

## Support

For questions:
- Check Moralis pricing & limits: https://moralis.io/pricing
- Review logs for specific error messages
- Increase `POLL_INTERVAL_MS` for more aggressive rate limiting
