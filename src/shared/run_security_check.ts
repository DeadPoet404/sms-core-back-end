import { hashPassword, verifyPassword, generateToken, verifyToken } from './security';

async function runVerification() {
  console.log('=== STARTING SECURITY UTILITIES VERIFICATION ===\n');
  const rawPassword = 'SuperSecurePassword123!';
  console.log(`[Input Password]: ${rawPassword}`);
  const hashedPassword = await hashPassword(rawPassword);
  console.log(`[Generated Hash]: ${hashedPassword}`);
  const isMatch = await verifyPassword(rawPassword, hashedPassword);
  console.log(`[Verification Match (True)]: ${isMatch}`);
  const isFalseMatch = await verifyPassword('WrongPassword!', hashedPassword);
  console.log(`[Verification Mismatch (False)]: ${isFalseMatch}\n`);

  const mockPayload = { userId: 'usr_01J0X4', tenantId: 'school_accra_01', role: 'SchoolAdmin' };
  const secretKey = 'super_secret_environment_variable_key';
  console.log('[Token Input Payload]:', mockPayload);
  const token = generateToken(mockPayload, secretKey);
  console.log(`[Generated Stateless Token]: ${token}`);
  const verifiedData = verifyToken(token, secretKey);
  console.log('[Verified Token Payload Output]:', verifiedData);
  console.log('\n=== VERIFICATION RUN COMPLETE ===');
}

runVerification().catch(console.error);
