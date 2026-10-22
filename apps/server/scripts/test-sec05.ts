import { generateOutcomeEmailHtml, sendApplicationConfirmationEmail, __setTestTransporter } from '../src/utils/email';

async function main() {
  console.log('=== REGRESSION TEST FOR SEC-05: HTML/EMAIL INJECTION ===');
  let failed = 0;

  const maliciousName = '<img src=x onerror=alert(1)>';
  const maliciousMessage = 'Dear Applicant,\nHere is a malicious link: <a href="http://attacker.com">Claim Prize</a>\n\nThanks,\nHiring Team';
  const maliciousJob = '"><script>alert("xss")</script>';
  const maliciousOrg = 'EvilCorp<svg onload=alert(2)>';

  // TEST 1: Outcome Email
  console.log('\n[TEST 1] Testing generateOutcomeEmailHtml with malicious outcome message...');
  const outcomeHtml = generateOutcomeEmailHtml({
    to: 'target@example.com',
    candidateName: maliciousName,
    jobTitle: maliciousJob,
    orgName: maliciousOrg,
    subject: 'Application Outcome',
    message: maliciousMessage,
  });

  console.log('--- GENERATED OUTCOME EMAIL HTML ---');
  console.log(outcomeHtml);
  console.log('------------------------------------');

  if (outcomeHtml.includes('<a href="http://attacker.com">')) {
    console.log('FAILURE: Raw <a href=...> tag was found unescaped in email HTML!');
    failed++;
  } else if (!outcomeHtml.includes('&lt;a href=&quot;http://attacker.com&quot;&gt;') && !outcomeHtml.includes('&lt;a href=&#39;http://attacker.com&#39;&gt;')) {
    console.log('FAILURE: <a href=...> was not properly HTML-escaped!');
    failed++;
  } else {
    console.log('PASS: Malicious <a href=...> is properly HTML-escaped in outcome message.');
  }

  if (outcomeHtml.includes('<script>') || outcomeHtml.includes('<svg onload=')) {
    console.log('FAILURE: Raw HTML/Script tag was found unescaped in jobTitle or orgName!');
    failed++;
  } else {
    console.log('PASS: orgName and jobTitle are properly HTML-escaped.');
  }

  // TEST 2: Confirmation Email with malicious applicant name
  console.log('\n[TEST 2] Testing sendApplicationConfirmationEmail with malicious applicant name <img src=x onerror=alert(1)>...');
  let capturedHtml = '';
  __setTestTransporter({
    sendMail: async (opts: any) => {
      capturedHtml = opts.html;
      return { messageId: 'test-msg-id' };
    }
  } as any);

  await sendApplicationConfirmationEmail({
    to: 'applicant@example.com',
    candidateName: maliciousName,
    jobTitle: 'Senior Security Engineer',
    orgName: 'Acme Corp',
  });

  console.log('--- GENERATED APPLICANT CONFIRMATION HTML ---');
  console.log(capturedHtml);
  console.log('---------------------------------------------');

  if (capturedHtml.includes('<img src=x onerror=alert(1)>')) {
    console.log('FAILURE: Raw <img src=x onerror=alert(1)> was found unescaped in email HTML!');
    failed++;
  } else if (!capturedHtml.includes('&lt;img src=x onerror=alert(1)&gt;')) {
    console.log('FAILURE: Applicant name with <img> tag was not properly HTML-escaped!');
    failed++;
  } else {
    console.log('PASS: Malicious applicant name is properly HTML-escaped (&lt;img src=x onerror=alert(1)&gt;).');
  }

  if (failed > 0) {
    console.log(`\n=== SEC-05 TEST RESULT: FAILED (${failed} checks failed) ===`);
    process.exit(1);
  } else {
    console.log('\n=== SEC-05 TEST RESULT: ALL CHECKS PASSED ===');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
