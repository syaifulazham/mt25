/**
 * Test script for Certificate Serial Number Generation
 * 
 * Run with: npx ts-node test-serial-generation.ts
 */

import { CertificateSerialService } from './src/lib/services/certificate-serial-service';

async function testSerialGeneration() {
  console.log('=== Certificate Serial Number Generation Test ===\n');

  try {
    // Test 1: Generate a GENERAL certificate serial
    console.log('Test 1: Generate GENERAL certificate serial');
    const serial1 = await CertificateSerialService.generateSerialNumber(
      1, // templateId
      'GENERAL',
      2025
    );
    console.log(`Generated: ${serial1}`);
    console.log(`Valid format: ${CertificateSerialService.validateSerialNumber(serial1)}\n`);

    // Test 2: Generate EVENT_PARTICIPANT serial
    console.log('Test 2: Generate EVENT_PARTICIPANT serial');
    const serial2 = await CertificateSerialService.generateSerialNumber(
      1,
      'EVENT_PARTICIPANT',
      2025
    );
    console.log(`Generated: ${serial2}\n`);

    // Test 3: Generate EVENT_WINNER serial
    console.log('Test 3: Generate EVENT_WINNER serial');
    const serial3 = await CertificateSerialService.generateSerialNumber(
      1,
      'EVENT_WINNER',
      2025
    );
    console.log(`Generated: ${serial3}\n`);

    // Test 4: Generate NON_CONTEST_PARTICIPANT serial
    console.log('Test 4: Generate NON_CONTEST_PARTICIPANT serial');
    const serial4 = await CertificateSerialService.generateSerialNumber(
      1,
      'NON_CONTEST_PARTICIPANT',
      2025
    );
    console.log(`Generated: ${serial4}\n`);

    // Test 5: Preview next serial number
    console.log('Test 5: Preview next GENERAL serial number');
    const nextSerial = await CertificateSerialService.previewNextSerialNumber(
      1,
      'GENERAL',
      2025
    );
    console.log(`Next serial will be: ${nextSerial}\n`);

    // Test 6: Get current sequence
    console.log('Test 6: Get current sequence for GENERAL');
    const currentSeq = await CertificateSerialService.getCurrentSequence(
      1,
      'GENERAL',
      2025
    );
    console.log(`Current sequence: ${currentSeq}\n`);

    // Test 7: Parse serial number
    console.log('Test 7: Parse serial number');
    const parsed = CertificateSerialService.parseSerialNumber(serial1);
    console.log('Parsed components:', parsed);
    console.log();

    // Test 8: Get statistics
    console.log('Test 8: Get serial statistics for 2025');
    const stats = await CertificateSerialService.getSerialStats(2025);
    console.log('Statistics:', JSON.stringify(stats, null, 2));
    console.log();

    console.log('=== All tests completed successfully! ===');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the tests
testSerialGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
