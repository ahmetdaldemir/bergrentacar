#!/usr/bin/env ts-node

/**
 * Script to clear all Redis cache
 * 
 * Usage:
 *   npm run clear:cache              # Clear all Redis cache
 *   npm run clear:cache -- --stats   # Show cache statistics
 */

import { getRedisClient } from '../config/redis.config';

async function main() {
  const args = process.argv.slice(2);
  const showStats = args.includes('--stats') || args.includes('-s');

  try {
    // Connect to Redis
    console.log('🔄 Connecting to Redis...');
    const redis = getRedisClient();
    if (!redis) {
      console.error('❌ Redis is disabled or not available');
      process.exit(1);
    }
    await redis.connect();
    console.log('✅ Redis connected');

    if (showStats) {
      // Show cache statistics
      console.log('\n📊 Fetching cache statistics...');
      const keys = await redis.keys('*');
      
      let totalSize = 0;
      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          totalSize += Buffer.byteLength(value, 'utf8');
        }
      }

      console.log('\n📈 Cache Statistics:');
      console.log(`   Total Keys: ${keys.length}`);
      console.log(`   Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`   Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
      // Clear all cache using FLUSHDB (clears current database)
      console.log('\n🗑️  Clearing all Redis cache...');
      await redis.flushdb();
      console.log('\n✅ Successfully cleared all Redis cache');
    }

    // Close connection
    await redis.quit();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

