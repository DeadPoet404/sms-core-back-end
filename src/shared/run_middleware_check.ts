import { generateToken } from './security';
import { authenticateRequest, SecurityContextError } from './context';

async function testMiddlewareGuardrail() {
  console.log('=== STARTING TENANT SCOPING MIDDLEWARE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const validPayload = { userId: 'usr_teacher_77', tenantId: 'school_accra_01', role: 'Teacher' };
  const validToken = generateToken(validPayload, secretKey);

  console.log('[Test Case 1] Processing valid bearer token request context...');
  try {
    const context = authenticateRequest(`Bearer ${validToken}`, secretKey);
    console.log('✅ Success! Request Context Isolated:', context);
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
  }

  console.log('\n[Test Case 2] Processing request with completely missing header (Fail-Closed Verification)...');
  try {
    authenticateRequest(undefined, secretKey);
    console.error('❌ Security Vulnerability: Request slipped through missing header validation!');
  } catch (err: any) {
    if (err instanceof SecurityContextError) {
      console.log(`✅ Blocked Cleanly. Status [${err.statusCode}]: ${err.message}`);
    } else {
      console.error('❌ Unexpected Error:', err);
    }
  }

  console.log('\n[Test Case 3] Processing request with altered cryptographic signature token...');
  try {
    const brokenToken = validToken + '_altered_signature_payload';
    authenticateRequest(`Bearer ${brokenToken}`, secretKey);
    console.error('❌ Security Vulnerability: Request slipped through with a broken signature!');
  } catch (err: any) {
    if (err instanceof SecurityContextError) {
      console.log(`✅ Blocked Cleanly. Status [${err.statusCode}]: ${err.message}`);
    } else {
      console.error('❌ Unexpected Error:', err);
    }
  }

  console.log('\n[Test Case 4] Processing token containing user info but completely missing tenantId identity...');
  try {
    const brokenPayload = { userId: 'usr_bad_actor', role: 'Student' };
    const incompleteToken = generateToken(brokenPayload, secretKey);
    authenticateRequest(`Bearer ${incompleteToken}`, secretKey);
    console.error('❌ Security Vulnerability: Request slipped through without structural tenant verification boundaries!');
  } catch (err: any) {
    if (err instanceof SecurityContextError) {
      console.log(`✅ Blocked Cleanly. Status [${err.statusCode}]: ${err.message}`);
    } else {
      console.error('❌ Unexpected Error:', err);
    }
  }

  console.log('\n=== TENANT SCOPING RUN COMPLETE ===');
}

testMiddlewareGuardrail().catch(console.error);
