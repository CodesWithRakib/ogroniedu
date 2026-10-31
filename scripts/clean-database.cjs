/**
 * OgroniEdu Database Cleaner & Authentic Real-Type Baseline Seeder
 *
 * Usage:
 *   node scripts/clean-database.cjs
 *   or
 *   pnpm db:clean
 */

const path = require('path');
const pgPath = require.resolve('pg', {
  paths: [__dirname, process.cwd(), path.join(process.cwd(), 'apps/api'), path.join(process.cwd(), 'packages/database')]
});
const { Client } = require(pgPath);

const bcryptPath = require.resolve('bcryptjs', {
  paths: [__dirname, process.cwd(), path.join(process.cwd(), 'apps/api')]
});
const bcrypt = require(bcryptPath);

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ogroniedu_dev'
});

async function run() {
  await client.connect();
  console.log('===============================================================');
  console.log('          OGRONIEDU DATABASE PURGE & REAL-TYPE SEEDER          ');
  console.log('===============================================================');

  // 1. Truncate transactional, mock, and test tables
  const tables = [
    'booking_status_events',
    'booking_session_series',
    'session_attendance',
    'booking_sessions',
    'booking_messages',
    'booking_disputes',
    'bookings',
    'tuition_request_suggestions',
    'tuition_request_applications',
    'tuition_requests',
    'guardian_student_links',
    'student_profiles',
    'tutor_subjects',
    'tutor_service_areas',
    'tutor_verification_reviews',
    'tutor_verification_documents',
    'tutor_verification_levels',
    'tutor_availability_exceptions',
    'tutor_profiles',
    'tutor_financial_accounts',
    'tutor_earning_adjustments',
    'session_settlements',
    'escrow_holds',
    'payment_refunds',
    'payouts',
    'invoices',
    'ledger_entries',
    'ledger_journals',
    'payment_orders',
    'reconciliation_runs',
    'assignment_revisions',
    'assignment_submissions',
    'assignments',
    'learning_materials',
    'learning_goals',
    'safety_case_events',
    'safety_case_messages',
    'safety_actions',
    'safety_reports',
    'tutor_replacement_case_events',
    'tutor_replacement_cases',
    'support_tickets',
    'reviews',
    'saved_tutors',
    'file_assets',
    'notifications',
    'notification_preferences',
    'user_onboarding',
    'auth_magic_links',
    'auth_verification_codes',
    'audit_logs'
  ];

  console.log('\n[1/3] Truncating all transactional and test tables...');
  for (const table of tables) {
    try {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (err) {
      // Ignored if relation is missing or not yet migrated
    }
  }

  // 2. Remove all non-admin users
  const adminId = '00000000-0000-4000-a000-000000000000';
  await client.query(`DELETE FROM user_roles WHERE user_id != $1;`, [adminId]);
  await client.query(`DELETE FROM users WHERE id != $1;`, [adminId]);
  console.log('[OK] Purged old non-admin users and roles');

  // 3. Seed Authentic Real-Type Baseline
  console.log('\n[2/3] Seeding authentic real-world users & profiles...');
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // Fetch role IDs
  const rolesRes = await client.query('SELECT id, code FROM roles');
  const roleMap = {};
  rolesRes.rows.forEach(r => { roleMap[r.code] = r.id; });

  // A. Admin Account
  await client.query(`
    INSERT INTO users (id, email, phone_e164, password_hash, display_name, display_name_en, display_name_bn, status, email_verified_at, phone_verified_at)
    VALUES ($1, 'admin.demo@ogroniedu.com', '+8801711000000', $2, 'সুপার অ্যাডমিন (Super Admin)', 'Super Admin', 'সুপার অ্যাডমিন', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET password_hash = $2, display_name = 'সুপার অ্যাডমিন (Super Admin)', status = 'active';
  `, [adminId, passwordHash]);

  await client.query(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1, $2), ($1, $3)
    ON CONFLICT DO NOTHING;
  `, [adminId, roleMap['admin'], roleMap['super_admin']]);
  console.log('  -> Admin verified');

  // B. Tutors
  const tutors = [
    {
      id: '22222222-2222-4222-b222-222222222222',
      email: 'mahmud.buet@ogroniedu.com',
      phone: '+8801711223344',
      nameEn: 'Mahmudul Hasan',
      nameBn: 'মাহমুদ হাসান',
      name: 'মাহমুদ হাসান (Mahmud Hasan)',
      headline: 'BUET Civil Eng. | Higher Math & Physics Specialist',
      headlineBn: 'বুয়েট সিভিল ইঞ্জিনিয়ারিং | নবম-দ্বাদশ শ্রেণির উচ্চতর গণিত ও পদার্থবিজ্ঞান শিক্ষক',
      bio: 'Passionate STEM educator from BUET with over 3 years of experience teaching SSC and HSC Higher Math & Physics.',
      bioBn: 'আমি বুয়েট থেকে সিভিল ইঞ্জিনিয়ারিংয়ে অধ্যয়নরত। বিগত ৩ বছর ধরে নবম-দশম ও একাদশ-দ্বাদশ শ্রেণির শিক্ষার্থীদের পদার্থবিজ্ঞান ও গণিত আনন্দের সাথে সহজ পদ্ধতিতে পাঠদান করছি।',
      exp: 3,
      rate: 50000,
      gender: 'male',
      district: 'Dhaka',
      preferredAreas: ['Mirpur', 'Dhanmondi', 'Palashi', 'Mohammadpur'],
      subjects: ['math_higher', 'physics', 'math_general']
    },
    {
      id: '33333333-3333-4333-b333-333333333333',
      email: 'nusrat.dmc@ogroniedu.com',
      phone: '+8801722334455',
      nameEn: 'Dr. Nusrat Jahan',
      nameBn: 'ডা. নুসরাত জাহান',
      name: 'ডা. নুসরাত জাহান (Dr. Nusrat Jahan)',
      headline: 'DMC Final Year MBBS | Biology & Chemistry Expert',
      headlineBn: 'ঢাকা মেডিকেল কলেজ | জীববিজ্ঞান ও রসায়ন বিশেষজ্ঞ শিক্ষক',
      bio: 'Medical scholar from Dhaka Medical College helping SSC & HSC students master Biology and Chemistry with conceptual clarity.',
      bioBn: 'ঢাকা মেডিকেল কলেজের শেষ বর্ষের শিক্ষার্থী। বিগত ৪ বছর ধরে শিক্ষার্থীদের জীববিজ্ঞান ও রসায়নের জটিল বিষয়গুলো সহজে বোধগম্য করে পাঠদান করছি।',
      exp: 4,
      rate: 60000,
      gender: 'female',
      district: 'Dhaka',
      preferredAreas: ['Dhanmondi', 'Baily Road', 'Lalmatia', 'Mirpur'],
      subjects: ['biology', 'chemistry']
    },
    {
      id: '44444444-4444-4444-b444-444444444444',
      email: 'tanvir.iba@ogroniedu.com',
      phone: '+8801733445566',
      nameEn: 'Tanvir Ahmed',
      nameBn: 'তানভীর আহমেদ',
      name: 'তানভীর আহমেদ (Tanvir Ahmed)',
      headline: 'DU IBA Graduate | English & ICT Educator',
      headlineBn: 'ঢাবি আইবিএ | ইংরেজি ও আইসিটি শিক্ষক',
      bio: 'Experienced tutor from IBA, University of Dhaka specializing in English Grammar, Creative Writing and ICT for secondary levels.',
      bioBn: 'ঢাকা বিশ্ববিদ্যালয়ের আইবিএ থেকে স্নাতক। মাধ্যমিক শিক্ষার্থীদের ইংরেজি ও আইসিটিতে বাস্তবমুখী দক্ষতা অর্জনে সহায়তা করি।',
      exp: 3,
      rate: 55000,
      gender: 'male',
      district: 'Dhaka',
      preferredAreas: ['Gulshan', 'Banani', 'Uttara', 'Dhanmondi'],
      subjects: ['english', 'ict']
    }
  ];

  const subsRes = await client.query('SELECT id, code FROM subjects');
  const subMap = {};
  subsRes.rows.forEach(s => { subMap[s.code] = s.id; });

  const secLevelId = 'fa1b9b9a-4b8f-4635-b86a-44d36fd42e6a'; // secondary_ssc
  const banglaCurriculumId = '6aebc301-c7f2-4dec-809d-2201fd4db03b'; // bangla_medium

  for (const t of tutors) {
    await client.query(`
      INSERT INTO users (id, email, phone_e164, password_hash, display_name, display_name_en, display_name_bn, status, email_verified_at, phone_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET password_hash = $4, display_name = $5;
    `, [t.id, t.email, t.phone, passwordHash, t.name, t.nameEn, t.nameBn]);

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [t.id, roleMap['tutor']]);

    await client.query(`
      INSERT INTO tutor_profiles (
        user_id, headline, headline_en, headline_bn, bio, bio_en, bio_bn,
        years_experience, hourly_rate_minor, currency, verification_status,
        publication_status, gender, district, preferred_areas, teaching_modes,
        verified_at, created_at, updated_at
      ) VALUES (
        $1, $2, $2, $3, $4, $4, $5,
        $6, $7, 'BDT', 'approved',
        'published', $8, $9, $10, ARRAY['online', 'in_person'],
        NOW(), NOW(), NOW()
      ) ON CONFLICT (user_id) DO UPDATE SET
        headline = $2, headline_en = $2, headline_bn = $3,
        bio = $4, bio_en = $4, bio_bn = $5,
        verification_status = 'approved', publication_status = 'published',
        gender = $8, district = $9;
    `, [t.id, t.headline, t.headlineBn, t.bio, t.bioBn, t.exp, t.rate, t.gender, t.district, t.preferredAreas]);

    // Tutor Verification Level Badge
    await client.query(`
      INSERT INTO tutor_verification_levels (
        tutor_user_id, level, status, decided_at, policy_version
      ) VALUES (
        $1, 'educational', 'approved', NOW(), 'v2.0'
      ) ON CONFLICT DO NOTHING;
    `, [t.id]);

    for (const subCode of t.subjects) {
      if (subMap[subCode]) {
        await client.query(`
          INSERT INTO tutor_subjects (
            tutor_user_id, subject_id, education_level_id, curriculum_id, rate_minor, currency
          ) VALUES ($1, $2, $3, $4, $5, 'BDT')
          ON CONFLICT DO NOTHING;
        `, [t.id, subMap[subCode], secLevelId, banglaCurriculumId, t.rate]);
      }
    }
    console.log(`  -> Tutor seeded: ${t.name}`);
  }

  // C. Guardian: Farhana Chowdhury
  const guardianId = '11111111-1111-4111-a111-111111111111';
  await client.query(`
    INSERT INTO users (id, email, phone_e164, password_hash, display_name, display_name_en, display_name_bn, status, email_verified_at, phone_verified_at)
    VALUES ($1, 'farhana.chowdhury@ogroniedu.com', '+8801755667788', $2, 'ফারহানা চৌধুরী (Farhana Chowdhury)', 'Farhana Chowdhury', 'ফারহানা চৌধুরী', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET password_hash = $2, display_name = 'ফারহানা চৌধুরী (Farhana Chowdhury)';
  `, [guardianId, passwordHash]);

  await client.query(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING;
  `, [guardianId, roleMap['guardian']]);
  console.log('  -> Guardian seeded: Farhana Chowdhury');

  // D. Student Child: Asif Iqbal
  const studentId = '55555555-5555-4555-a555-555555555555';
  await client.query(`
    INSERT INTO users (id, email, phone_e164, password_hash, display_name, display_name_en, display_name_bn, status, email_verified_at, phone_verified_at)
    VALUES ($1, 'asif.iqbal@ogroniedu.com', '+8801766778899', $2, 'আসিফ ইকবাল (Asif Iqbal)', 'Asif Iqbal', 'আসিফ ইকবাল', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET password_hash = $2, display_name = 'আসিফ ইকবাল (Asif Iqbal)';
  `, [studentId, passwordHash]);

  await client.query(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING;
  `, [studentId, roleMap['student']]);

  await client.query(`
    INSERT INTO student_profiles (
      user_id, institution_name, education_level_id, curriculum_id, learning_goals, created_at, updated_at
    ) VALUES (
      $1, 'Mirpur Cantonment Public School & College', $2, $3, 'নবম শ্রেণিতে উচ্চতর গণিত ও পদার্থবিজ্ঞানে এ প্লাস অর্জন করা', NOW(), NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET institution_name = 'Mirpur Cantonment Public School & College';
  `, [studentId, secLevelId, banglaCurriculumId]);

  await client.query(`
    INSERT INTO guardian_student_links (
      guardian_user_id, student_user_id, relationship_type, status, consent_recorded_at
    ) VALUES (
      $1, $2, 'mother', 'active', NOW()
    ) ON CONFLICT DO NOTHING;
  `, [guardianId, studentId]);
  console.log('  -> Student Child seeded & linked: Asif Iqbal');

  console.log('\n[3/3] Checking Baseline Stats:');
  const uCount = await client.query('SELECT count(*) FROM users');
  const rCount = await client.query('SELECT count(*) FROM roles');
  const cCount = await client.query('SELECT count(*) FROM curricula');
  const sCount = await client.query('SELECT count(*) FROM subjects');
  const tqCount = await client.query('SELECT count(*) FROM tuition_requests');

  console.log({
    users: uCount.rows[0].count,
    roles: rCount.rows[0].count,
    curricula: cCount.rows[0].count,
    subjects: sCount.rows[0].count,
    activeTuitionRequests: tqCount.rows[0].count
  });

  console.log('\n===============================================================');
  console.log('       DATABASE CLEANED & REAL DATA SEEDED SUCCESSFULLY!       ');
  console.log('===============================================================');
  await client.end();
}

run().catch(err => {
  console.error('Database cleaner failed:', err);
  process.exit(1);
});
