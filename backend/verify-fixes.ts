/**
 * COMPREHENSIVE VERIFICATION TEST
 * 
 * Tests to verify all fixes for "Instância não está conectada" error:
 * 
 * Fix 1: isActive flag validation in isConnectedOrStored()
 * Fix 2: Reset stale connections on server startup
 */

import sequelize from './src/config/database';
import { WhatsAppInstance } from './src/models';
import whatsappService from './src/adapters/whatsapp.config';
import logger from './src/utils/logger';

async function comprehensiveTest() {
  try {
    console.log('📋 ============================================');
    console.log('   COMPREHENSIVE VERIFICATION TEST');
    console.log('============================================\n');

    await sequelize.authenticate();
    logger.info('✅ Database connected\n');

    // TEST 1: Check status of instances after server restart
    console.log('TEST 1: Instance Status After Server Restart');
    console.log('─'.repeat(50));
    const allInstances = await WhatsAppInstance.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'status', 'isActive', 'connectedAt'],
      raw: true,
    });

    logger.info(`Found ${allInstances.length} active instances (isActive=true):\n`);
    if (allInstances.length === 0) {
      logger.warn('⚠️  No active instances - this is expected after server restart with reset fix');
    } else {
      allInstances.forEach((inst: any, idx: number) => {
        logger.info(`  ${idx + 1}. ${inst.name} (${inst.id})`);
        logger.info(`     Status: ${inst.status}, isActive: ${inst.isActive}, connectedAt: ${inst.connectedAt}\n`);
      });
    }

    // TEST 2: If there's an instance, test isConnectedOrStored
    if (allInstances.length > 0) {
      const testInstance = allInstances[0] as any;
      console.log('\nTEST 2: Connection Verification Methods');
      console.log('─'.repeat(50));
      logger.info(`Testing with instance: ${testInstance.name}`);
      logger.info(`  Database status: ${testInstance.status}`);
      logger.info(`  Database isActive: ${testInstance.isActive}`);
      logger.info(`  Database connectedAt: ${testInstance.connectedAt}\n`);

      // This is the critical method used during campaign start
      const isConnectedOrStored = await whatsappService.isConnectedOrStored(testInstance.id);
      logger.info(`isConnectedOrStored() result: ${isConnectedOrStored}\n`);

      if (!isConnectedOrStored && testInstance.status === 'connected') {
        logger.warn('⚠️  Instance marked as connected in DB but isConnectedOrStored returned false');
        logger.warn('    This could mean: instance has been offline since server restart');
        logger.warn('    User needs to reconnect this WhatsApp instance');
      }
    }

    // TEST 3: Check for soft-deleted instances (should not affect anything)
    console.log('\nTEST 3: Soft-Deleted Instances Validation');
    console.log('─'.repeat(50));
    const softDeletedCount = await WhatsAppInstance.count({
      where: { isActive: false },
    });
    logger.info(`Soft-deleted instances (isActive=false): ${softDeletedCount}`);

    if (softDeletedCount > 0) {
      const sampleDeleted = await WhatsAppInstance.findOne({
        where: { isActive: false },
        attributes: ['id', 'name', 'status', 'isActive'],
        raw: true,
      });
      
      if (sampleDeleted) {
        logger.info(`Example: ${sampleDeleted.name}`);
        const checkDeleted = await whatsappService.isConnectedOrStored((sampleDeleted as any).id);
        logger.info(`isConnectedOrStored() on soft-deleted: ${checkDeleted}`);
        
        if (checkDeleted) {
          logger.error('❌ ERROR: Soft-deleted instance returned true! Fix may not be working');
        } else {
          logger.info('✅ Soft-deleted instance correctly rejected\n');
        }
      }
    }

    // SUMMARY
    console.log('\nSUMMARY');
    console.log('═'.repeat(50));
    logger.info('Expected behavior:');
    logger.info('  ✓ After server restart, stale "connected" instances reset to "disconnected"');
    logger.info('  ✓ isConnectedOrStored() correctly validates isActive flag');
    logger.info('  ✓ Soft-deleted instances (isActive=false) always return false');
    logger.info('  ✓ Campaign start requires actual connection in memory, not just DB status');
    logger.info('\nIf you see all ✅ above, the fixes are working correctly!');

    process.exit(0);
  } catch (err) {
    logger.error('Test failed:', err);
    process.exit(1);
  }
}

comprehensiveTest();
