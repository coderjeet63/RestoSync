// src/config/redis.js
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Upstash is serverless (REST), so we "verify" by sending a ping request
try {
  const ping = await redis.ping();
  if (ping === 'PONG') {
    console.log("✅ Upstash Redis: Connection verified (Ping successful)");
  }
} catch (error) {
  console.error("❌ Upstash Redis: Connection failed -", error.message);
}

export default redis
