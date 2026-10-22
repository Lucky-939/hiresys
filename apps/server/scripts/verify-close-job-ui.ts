import puppeteer from 'puppeteer';

async function runTest() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // 1. Log in
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[type="email"]', 'owner@test.com');
    await page.type('input[type="password"]', 'pwd');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 2. Go to Jobs page
    console.log('Navigating to Jobs dashboard...');
    await page.goto('http://localhost:3000/dashboard/jobs', { waitUntil: 'networkidle2' });
    
    // 3. Find a job
    console.log('Looking for jobs...');
    await page.waitForSelector('.flex.items-center.gap-4.px-4.py-3.border-b', { timeout: 5000 });
    
    // Find the Close button (the one we just added)
    console.log('Clicking the close job button...');
    
    // Set up dialog handler
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    const closeButtonSelector = 'button[title="Close job"]';
    const closeBtn = await page.$(closeButtonSelector);
    
    if (closeBtn) {
      await closeBtn.click();
      console.log('Close button clicked.');
      
      // Wait for network response for the PATCH request
      const patchResponse = await page.waitForResponse(response => 
        response.url().includes('/jobs/') && response.request().method() === 'PATCH'
      );
      
      console.log(`PATCH Request status: ${patchResponse.status()}`);
      
      // Look for the toast message
      console.log('Waiting for toast notification...');
      const toastElement = await page.waitForSelector('li[data-sonner-toast]', { timeout: 5000 });
      const toastText = await page.evaluate(el => el.textContent, toastElement);
      console.log(`Toast message: ${toastText}`);
      
      console.log('Click-through test completed successfully!');
    } else {
      console.log('Could not find a Close job button. Creating a job first...');
      // create a job flow
      await page.click('button:has-text("Create Job")');
      await page.waitForSelector('input[name="title"]', { timeout: 5000 }); // Wait for modal
      await page.type('input[name="title"]', 'Puppeteer Test Job');
      await page.type('textarea[name="description"]', 'Test job for puppeteer closing.');
      await page.click('button:has-text("Create Job")');
      
      await page.waitForResponse(response => 
        response.url().includes('/jobs') && response.request().method() === 'POST'
      );
      
      console.log('Job created. Retrying close click...');
      const newCloseBtn = await page.waitForSelector(closeButtonSelector, { timeout: 5000 });
      if (newCloseBtn) {
          await newCloseBtn.click();
          console.log('Close button clicked.');
          const patchResponse = await page.waitForResponse(response => 
            response.url().includes('/jobs/') && response.request().method() === 'PATCH'
          );
          console.log(`PATCH Request status: ${patchResponse.status()}`);
          console.log('Click-through test completed successfully!');
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

runTest();
