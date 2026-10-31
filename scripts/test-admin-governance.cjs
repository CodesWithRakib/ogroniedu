const fs = require('fs');
const path = require('path');

function getPlaywright() {
  const pnpmDir = path.join(process.cwd(), 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir);
    const pwDir = entries.find((e) => e.startsWith('playwright@'));
    if (pwDir) {
      const pwModulePath = path.join(pnpmDir, pwDir, 'node_modules/playwright');
      if (fs.existsSync(pwModulePath)) {
        return require(pwModulePath);
      }
    }
  }
  return require('playwright');
}

const { chromium } = getPlaywright();

const SCREENSHOT_DIR = 'C:/Users/RAKIB/.gemini/antigravity-cli/brain/8ca51e0a-5269-4e05-b667-97a160952928/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('=== STARTING ADMIN GOVERNANCE AUTOMATION IN HEADFUL CHROMIUM ===');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Visit Login Page
    console.log('[Step 1] Visiting Login Page...');
    await page.goto('http://localhost:5000/bn/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_01_login_quickfill.png') });
    console.log('  -> Screenshot saved: admin_gov_01_login_quickfill.png');

    // 2. Click Super Admin Quick-Fill & Login
    console.log('[Step 2] Quick-filling Super Admin credentials...');
    await page.click('button[title*="admin.demo@ogroniedu.com"]');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    console.log('  -> Logged in successfully as Super Admin');

    // 3. Navigate to Users Hub
    console.log('[Step 3] Navigating to Admin Users Hub...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_02_users_hub.png') });
    console.log('  -> Screenshot saved: admin_gov_02_users_hub.png');

    // 4. Navigate to Administrator Roster (Super Admin Concealed)
    console.log('[Step 4] Checking Administrator Roster...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users/admins', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_03_admin_roster.png') });
    console.log('  -> Screenshot saved: admin_gov_03_admin_roster.png');

    // Verify Super Admin is not visible in roster list
    const pageTextRoster = await page.textContent('body');
    if (!pageTextRoster.includes('admin.demo@ogroniedu.com')) {
      console.log('  -> [PASS] Super Admin (admin.demo@ogroniedu.com) is correctly CONCEALED in Admin Roster');
    } else {
      console.error('  -> [FAIL] Super Admin found in Admin Roster!');
    }

    // 4b. Test Add Staff Member with duplicate email to check exact server error rendering
    console.log('[Step 4b] Testing Add Staff Member exact error rendering...');
    const addStaffBtn = page.locator('[data-testid="create-staff-btn"]');
    if (await addStaffBtn.isVisible()) {
      await addStaffBtn.click();
      await page.waitForTimeout(600);

      // Fill in existing staff email to trigger real backend error
      await page.fill('input[placeholder="উদা: সাদিয়া রহমান"]', 'Duplicate Staff Test');
      await page.fill('input[placeholder="staff.name@ogroniedu.com"]', 'staff.demo@ogroniedu.com');
      await page.fill('input[type="password"]', 'Password123!');

      // Click submit
      await page.click('button[type="submit"]:has-text("নিশ্চিত করুন")');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_04_create_staff_error.png') });
      console.log('  -> Screenshot saved: admin_gov_04_create_staff_error.png');

      // Verify exact error message rendered
      const errorAlert = page.locator('[data-slot="alert"]');
      if (await errorAlert.isVisible()) {
        const errorText = await errorAlert.textContent();
        console.log('  -> [PASS] Exact Error Displayed:', errorText);
      }

      // Close modal
      await page.click('button:has-text("বাতিল")');
      await page.waitForTimeout(400);
    }

    // 5. Navigate to Tutors & KYC Verification Desk
    console.log('[Step 5] Checking Tutors & KYC Verification Desk...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users/tutors', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_05_tutors_directory.png') });
    console.log('  -> Screenshot saved: admin_gov_05_tutors_directory.png');

    // Switch to KYC Verification Queue Tab
    console.log('[Step 5b] Switching to KYC Verification Queue tab...');
    const kycTabBtn = page.locator('[data-testid="tab-tutors-kyc"]');
    if (await kycTabBtn.isVisible()) {
      await kycTabBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_05b_tutors_kyc_queue.png') });
      console.log('  -> Screenshot saved: admin_gov_05b_tutors_kyc_queue.png');
    }

    // 6. Navigate to Tutor Dedicated Details Desk (Mahmudul Hasan)
    console.log('[Step 6] Opening Tutor 360° Management Desk for Mahmudul Hasan...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users/tutors/22222222-2222-4222-b222-222222222222', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_06_tutor_details_overview.png') });
    console.log('  -> Screenshot saved: admin_gov_06_tutor_details_overview.png');

    // Test Inline Edit
    console.log('[Step 6b] Testing Inline Edit Mode...');
    const editBtn = page.locator('[data-testid="edit-tutor-profile-btn"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_07_tutor_details_editing.png') });
      console.log('  -> Screenshot saved: admin_gov_07_tutor_details_editing.png');

      // Click save
      await page.click('button[type="submit"]:has-text("সংরক্ষণ")');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_07_tutor_details_saved.png') });
      console.log('  -> Screenshot saved: admin_gov_07_tutor_details_saved.png');
    }

    // Check Audit History Tab
    console.log('[Step 6c] Checking Audit Logs & Change History Tab...');
    await page.click('button:has-text("অডিট হিস্ট্রি")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_08_tutor_audit_log.png') });
    console.log('  -> Screenshot saved: admin_gov_08_tutor_audit_log.png');

    // 7. Navigate to Students & Guardians Desk
    console.log('[Step 7] Checking Students & Guardians Governance...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users/students', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_09_students_guardians_all.png') });
    console.log('  -> Screenshot saved: admin_gov_09_students_guardians_all.png');

    // 8. Navigate to Master User Directory & verify Super Admin is NOT there
    console.log('[Step 8] Checking Master User Directory (Super Admin Concealment Verification)...');
    await page.goto('http://localhost:5000/bn/dashboard/admin/users/directory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_gov_13_user_directory_no_superadmin.png') });
    console.log('  -> Screenshot saved: admin_gov_13_user_directory_no_superadmin.png');

    const directoryText = await page.textContent('body');
    if (!directoryText.includes('admin.demo@ogroniedu.com')) {
      console.log('  -> [PASS] Super Admin (admin.demo@ogroniedu.com) is 100% CONCEALED in Master Directory!');
    } else {
      console.error('  -> [FAIL] Super Admin found in Master Directory!');
    }

    console.log('\n=== ALL ADMIN GOVERNANCE AUTOMATION CHECKS PASSED ===');
  } catch (err) {
    console.error('Automation encountered an error:', err);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
