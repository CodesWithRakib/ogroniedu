import pg from 'pg';

export async function runInitialSeed(
  client: pg.Client,
  options: { isProduction?: boolean } = {},
): Promise<void> {
  // 1. Seed Roles (Idempotent ON CONFLICT)
  const roles = [
    {
      code: 'student',
      name_en: 'Student',
      name_bn: 'শিক্ষার্থী',
      desc: 'Active enrolled student learner',
    },
    {
      code: 'guardian',
      name_en: 'Guardian / Parent',
      name_bn: 'অভিভাবক',
      desc: 'Parent or primary legal guardian',
    },
    {
      code: 'tutor',
      name_en: 'Tutor / Educator',
      name_bn: 'শিক্ষক',
      desc: 'Verified academic tutor educator',
    },
    {
      code: 'admin',
      name_en: 'System Administrator',
      name_bn: 'অ্যাডমিন',
      desc: 'Operational backoffice moderator',
    },
    {
      code: 'super_admin',
      name_en: 'Super Administrator',
      name_bn: 'সুপার অ্যাডমিন',
      desc: 'Executive security root admin',
    },
    {
      code: 'support_agent',
      name_en: 'Support Agent',
      name_bn: 'সাপোর্ট এজেন্ট',
      desc: 'Customer dispute and ticket support specialist',
    },
    {
      code: 'compliance_reviewer',
      name_en: 'Compliance Reviewer',
      name_bn: 'কমপ্লায়েন্স পর্যালোচক',
      desc: 'Tutor document verification and compliance auditor',
    },
    {
      code: 'organization_owner',
      name_en: 'Organization Owner',
      name_bn: 'প্রতিষ্ঠান মালিক',
      desc: 'Institutional coaching center / academy owner',
    },
    {
      code: 'organization_staff',
      name_en: 'Organization Staff',
      name_bn: 'প্রতিষ্ঠান কর্মী',
      desc: 'Institutional administrative staff',
    },
  ];

  for (const role of roles) {
    await client.query(
      `INSERT INTO roles (code, name_en, name_bn, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, description = EXCLUDED.description;`,
      [role.code, role.name_en, role.name_bn, role.desc],
    );
  }

  // 2. Seed Curricula
  const curricula = [
    {
      code: 'bangla_medium',
      name_en: 'National Curriculum (Bangla Medium)',
      name_bn: 'জাতীয় শিক্ষাক্রম (বাংলা মাধ্যম)',
      board: 'NCTB',
    },
    {
      code: 'english_version',
      name_en: 'National Curriculum (English Version)',
      name_bn: 'জাতীয় শিক্ষাক্রম (ইংলিশ ভার্সন)',
      board: 'NCTB',
    },
    {
      code: 'english_medium',
      name_en: 'English Medium (Cambridge / Edexcel)',
      name_bn: 'ইংলিশ মিডিয়াম (কেমব্রিজ / এডেক্সেল)',
      board: 'International',
    },
    {
      code: 'madrasah',
      name_en: 'Madrasah Education Board',
      name_bn: 'মাদ্রাসা শিক্ষাক্রম (দাখিল/আলিম)',
      board: 'Madrasah Board',
    },
  ];

  for (const c of curricula) {
    await client.query(
      `INSERT INTO curricula (code, name_en, name_bn, board_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, board_name = EXCLUDED.board_name;`,
      [c.code, c.name_en, c.name_bn, c.board],
    );
  }

  // 3. Seed Education Levels
  const levels = [
    {
      code: 'primary_1_5',
      name_en: 'Primary (Class 1-5)',
      name_bn: 'প্রাথমিক (১ম-৫ম শ্রেণি)',
      sort: 1,
    },
    {
      code: 'junior_6_8',
      name_en: 'Junior Secondary (Class 6-8)',
      name_bn: 'নিম্ন মাধ্যমিক (৬ষ্ঠ-৮ম শ্রেণি)',
      sort: 2,
    },
    {
      code: 'secondary_ssc',
      name_en: 'Secondary (Class 9-10 / SSC)',
      name_bn: 'মাধ্যমিক (৯ম-১০ম শ্রেণি / এসএসসি)',
      sort: 3,
    },
    {
      code: 'higher_hsc',
      name_en: 'Higher Secondary (Class 11-12 / HSC)',
      name_bn: 'উচ্চ মাধ্যমিক (একাদশ-দ্বাদশ শ্রেণি / এইচএসসি)',
      sort: 4,
    },
    {
      code: 'admission_prep',
      name_en: 'University & Medical Admission Prep',
      name_bn: 'বিশ্ববিদ্যালয় ও মেডিকেল ভর্তি প্রস্তুতি',
      sort: 5,
    },
  ];

  for (const lvl of levels) {
    await client.query(
      `INSERT INTO education_levels (code, name_en, name_bn, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, sort_order = EXCLUDED.sort_order;`,
      [lvl.code, lvl.name_en, lvl.name_bn, lvl.sort],
    );
  }

  // 4. Seed Academic Subjects
  const subjects = [
    { code: 'math_general', name_en: 'General Mathematics', name_bn: 'সাধারণ গণিত' },
    { code: 'math_higher', name_en: 'Higher Mathematics', name_bn: 'উচ্চতর গণিত' },
    { code: 'physics', name_en: 'Physics', name_bn: 'পদার্থবিজ্ঞান' },
    { code: 'chemistry', name_en: 'Chemistry', name_bn: 'রসায়ন' },
    { code: 'biology', name_en: 'Biology', name_bn: 'জীববিজ্ঞান' },
    { code: 'english', name_en: 'English (1st & 2nd Paper)', name_bn: 'ইংরেজি (১ম ও ২য় পত্র)' },
    { code: 'bangla', name_en: 'Bangla (1st & 2nd Paper)', name_bn: 'বাংলা (১ম ও ২য় পত্র)' },
    {
      code: 'ict',
      name_en: 'Information & Communication Tech (ICT)',
      name_bn: 'তথ্য ও যোগাযোগ প্রযুক্তি (আইসিটি)',
    },
  ];

  for (const s of subjects) {
    await client.query(
      `INSERT INTO subjects (code, name_en, name_bn)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE
       SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn;`,
      [s.code, s.name_en, s.name_bn],
    );
  }

  // 5. Seed Chart of Accounts (Double-Entry Financial Ledger)
  const ledgerAccounts = [
    { code: '1000', name: 'Escrow Holding Pool (bKash/Nagad/Bank)', type: 'asset', cur: 'BDT' },
    { code: '1100', name: 'Platform Operating Bank Account', type: 'asset', cur: 'BDT' },
    { code: '2000', name: 'Tutor Earnings Payable Liability', type: 'liability', cur: 'BDT' },
    {
      code: '2100',
      name: 'Student Advance Escrow Deposit Liability',
      type: 'liability',
      cur: 'BDT',
    },
    { code: '3000', name: 'Platform Capital / Retained Earnings', type: 'equity', cur: 'BDT' },
    { code: '4000', name: 'Tutoring Platform Service Fee Revenue', type: 'revenue', cur: 'BDT' },
    {
      code: '5000',
      name: 'Mobile Financial Services (MFS) Gateway Fees Expense',
      type: 'expense',
      cur: 'BDT',
    },
  ];

  for (const acc of ledgerAccounts) {
    await client.query(
      `INSERT INTO ledger_accounts (code, name, account_type, currency)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, account_type = EXCLUDED.account_type, currency = EXCLUDED.currency;`,
      [acc.code, acc.name, acc.type, acc.cur],
    );
  }

  // 6. Seed Synthetic Demo Users (Guardian, Tutor, Student)
  // Production security invariant: Production seed MUST NEVER create demo users.
  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  if (isProd) {
    return;
  }

  // Dev/E2E-only credential for the three demo accounts below.
  // Documented in apps/web/e2e/README.md; unusable in production (early return above).
  // bcrypt(12) of 'OgroniDev#2026'.
  const DEMO_PASSWORD_HASH = '$2b$12$Cr4Ty5alrOGkqdKbbsY8Nevf6tLD4YTjwkmLwwOki.Q0YB2soQ7bi';

  const demoUsers = [
    {
      id: '00000000-0000-4000-a000-000000000000',
      email: 'admin.demo@ogroniedu.com',
      phone: '+8801711000000',
      name: 'সুপার অ্যাডমিন (Super Admin)',
      locale: 'bn',
      status: 'active',
    },
    {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'guardian.demo@ogroniedu.com',
      phone: '+8801711000001',
      name: 'তানভীর আহমেদ (Tanvir Ahmed)',
      locale: 'bn',
      status: 'active',
    },
    {
      id: '22222222-2222-4222-b222-222222222222',
      email: 'tutor.demo@ogroniedu.com',
      phone: '+8801711000002',
      name: 'রাশেদ করিম (Rashed Karim)',
      locale: 'bn',
      status: 'active',
    },
    {
      id: '33333333-3333-4333-b333-333333333333',
      email: 'student.demo@ogroniedu.com',
      phone: '+8801711000003',
      name: 'আবরার আহমেদ (Abrar Ahmed)',
      locale: 'bn',
      status: 'active',
    },
  ];

  for (const u of demoUsers) {
    await client.query(
      `INSERT INTO users (id, email, phone_e164, password_hash, display_name, preferred_locale, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
       SET display_name = EXCLUDED.display_name, status = EXCLUDED.status, password_hash = EXCLUDED.password_hash;`,
      [u.id, u.email, u.phone, DEMO_PASSWORD_HASH, u.name, u.locale, u.status],
    );
  }

  // Assign user roles
  const userRoleAssignments = [
    { userId: '00000000-0000-4000-a000-000000000000', roleCode: 'super_admin' },
    { userId: '00000000-0000-4000-a000-000000000000', roleCode: 'admin' },
    { userId: '11111111-1111-4111-a111-111111111111', roleCode: 'guardian' },
    { userId: '22222222-2222-4222-b222-222222222222', roleCode: 'tutor' },
    { userId: '33333333-3333-4333-b333-333333333333', roleCode: 'student' },
  ];

  for (const a of userRoleAssignments) {
    const roleRes = await client.query('SELECT id FROM roles WHERE code = $1;', [a.roleCode]);
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].id;
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING;`,
        [a.userId, roleId],
      );
    }
  }

  // Link Guardian to Student
  await client.query(
    `INSERT INTO guardian_student_links (guardian_user_id, student_user_id, relationship_type, status)
     VALUES ('11111111-1111-4111-a111-111111111111', '33333333-3333-4333-b333-333333333333', 'father', 'active')
     ON CONFLICT (guardian_user_id, student_user_id) DO UPDATE
     SET status = 'active';`,
  );

  // Tutor Profile for Rashed Karim — bilingual public copy.
  const tutorHeadlineEn =
    'BUET Civil Engineering | Experienced Physics & Higher Math tutor for SSC and HSC';
  const tutorBioEn =
    'With 5+ years of experience I help students build clear fundamentals and conceptual understanding.';
  await client.query(
    `INSERT INTO tutor_profiles (
       user_id, headline, bio, headline_en, headline_bn, bio_en, bio_bn,
       years_experience, teaching_modes, hourly_rate_minor, currency,
       verification_status, publication_status
     )
     VALUES ($1, $2, $3, $2, $4, $3, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (user_id) DO UPDATE
     SET headline = EXCLUDED.headline,
         bio = EXCLUDED.bio,
         headline_en = EXCLUDED.headline_en,
         headline_bn = EXCLUDED.headline_bn,
         bio_en = EXCLUDED.bio_en,
         bio_bn = EXCLUDED.bio_bn,
         verification_status = EXCLUDED.verification_status,
         publication_status = EXCLUDED.publication_status;`,
    [
      '22222222-2222-4222-b222-222222222222',
      tutorHeadlineEn,
      tutorBioEn,
      'বুয়েট সিভিল ইঞ্জিনিয়ারিং | এইচএসসি ও এসএসসি পদার্থবিজ্ঞান ও উচ্চতর গণিত অভিজ্ঞ শিক্ষক',
      '৫+ বছরের অভিজ্ঞতায় শিক্ষার্থীদের বেসিক ক্লিয়ার ও কনসেপচুয়াল লার্নিং নিশ্চিত করি।',
      5,
      ['in_person', 'online'],
      120000, // 1200 BDT in poisha (1200 * 100)
      'BDT',
      'approved',
      'published',
    ],
  );

  // Seed verified tutor qualifications for Rashed Karim
  const demoQualifications = [
    {
      id: 'aaaa1111-1111-4aaa-baaa-111111111101',
      type: 'nid',
      title: 'জাতীয় পরিচয়পত্র (NID) — বাংলাদেশ নির্বাচন কমিশন',
      institution: 'EC Bangladesh',
      year: 2020,
      status: 'approved',
    },
    {
      id: 'aaaa1111-1111-4aaa-baaa-111111111102',
      type: 'degree',
      title: 'বি.এস.সি. ইন সিভিল ইঞ্জিনিয়ারিং (B.Sc. in Civil Engineering)',
      institution: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (BUET)',
      year: 2023,
      status: 'approved',
    },
    {
      id: 'aaaa1111-1111-4aaa-baaa-111111111103',
      type: 'academic_certificate',
      title: 'এইচএসসি বিজ্ঞান বিভাগ (HSC Science)',
      institution: 'নটর ডেম কলেজ, ঢাকা',
      year: 2018,
      status: 'approved',
    },
  ];

  for (const q of demoQualifications) {
    await client.query(
      `INSERT INTO tutor_qualifications (id, tutor_user_id, qualification_type, title, institution, issued_year, review_status)
       VALUES ($1, '22222222-2222-4222-b222-222222222222', $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title, institution = EXCLUDED.institution, review_status = EXCLUDED.review_status;`,
      [q.id, q.type, q.title, q.institution, q.year, q.status],
    );
  }

  // Demo teaching subject so discovery + booking-request flows work end to end.
  // NOT EXISTS guard (not ON CONFLICT DO NOTHING: the table has no unique
  // constraint covering these columns, so a bare ON CONFLICT would insert
  // duplicate rows on every re-seed and duplicate subject cards in search).
  await client.query(
    `INSERT INTO tutor_subjects (tutor_user_id, subject_id, education_level_id, rate_minor, currency)
     SELECT '22222222-2222-4222-b222-222222222222', s.id, l.id, 120000, 'BDT'
     FROM subjects s, education_levels l
     WHERE s.code = 'physics' AND l.code = 'higher_hsc'
       AND NOT EXISTS (
         SELECT 1 FROM tutor_subjects ts
         WHERE ts.tutor_user_id = '22222222-2222-4222-b222-222222222222'
           AND ts.subject_id = s.id
           AND ts.education_level_id = l.id
       );`,
  );

  // Student Profile for Abrar Ahmed (Demo Student)
  await client.query(
    `INSERT INTO student_profiles (user_id, institution_name, stream, learning_goals, education_level_id, curriculum_id, profile_visibility)
     SELECT 
       '33333333-3333-4333-b333-333333333333',
       'ঢাকা রেসিডেনসিয়াল মডেল কলেজ',
       'science',
       'পদার্থবিজ্ঞান ও উচ্চতর গণিতে বেসিক স্ট্রং করা এবং এইচএসসিতে জিপিএ-৫ অর্জন।',
       l.id,
       c.id,
       'limited'
     FROM education_levels l, curricula c
     WHERE l.code = 'higher_hsc' AND c.code = 'bangla_medium'
     ON CONFLICT (user_id) DO UPDATE
     SET institution_name = EXCLUDED.institution_name,
         stream = EXCLUDED.stream,
         learning_goals = EXCLUDED.learning_goals;`,
  );

  // Active Accepted Booking between Tutor Rashed Karim & Student Abrar Ahmed
  const BOOKING_ID = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01';
  await client.query(
    `INSERT INTO bookings (
       id, requester_user_id, student_user_id, tutor_user_id, subject_id, education_level_id,
       mode, status, price_per_session_minor, currency, duration_minutes, cancellation_policy_version, service_agreement_snapshot
     )
     SELECT 
       $1, '33333333-3333-4333-b333-333333333333', '33333333-3333-4333-b333-333333333333', '22222222-2222-4222-b222-222222222222',
       s.id, l.id, 'online', 'accepted', 120000, 'BDT', 60, 'v1.0-standard-cancellation', '{}'::JSONB
     FROM subjects s, education_levels l
     WHERE s.code = 'physics' AND l.code = 'higher_hsc'
     ON CONFLICT (id) DO UPDATE
     SET status = 'accepted', price_per_session_minor = 120000;`,
    [BOOKING_ID],
  );

  // Completed Session from 3 days ago
  const PAST_SESSION_ID = 'cccccccc-cccc-4ccc-accc-cccccccccc02';
  await client.query(
    `INSERT INTO booking_sessions (
       id, booking_id, tutor_user_id, student_user_id, starts_at, ends_at, timezone, status, meeting_url, completed_at
     )
     VALUES (
       $1, $2, '22222222-2222-4222-b222-222222222222', '33333333-3333-4333-b333-333333333333',
       now() - INTERVAL '3 days', now() - INTERVAL '3 days' + INTERVAL '1 hour', 'Asia/Dhaka',
       'completed', 'https://meet.google.com/ogr-phys-hsc', now() - INTERVAL '3 days' + INTERVAL '1 hour'
     )
     ON CONFLICT (id) DO UPDATE
     SET status = 'completed';`,
    [PAST_SESSION_ID, BOOKING_ID],
  );

  // Attendance Record for Past Session
  await client.query(
    `INSERT INTO session_attendance (session_id, participant_user_id, attendance_status, recorded_by, notes)
     VALUES (
       $1, '33333333-3333-4333-b333-333333333333', 'present', '22222222-2222-4222-b222-222222222222',
       'স্থির তড়িৎ অধ্যায় ও গাউস সূত্র বিশদ আলোচনা সম্পন্ন হয়েছে। ক্লাসে পূর্ণ মনোযোগ ছিল।'
     )
     ON CONFLICT (session_id, participant_user_id) DO UPDATE
     SET attendance_status = 'present';`,
    [PAST_SESSION_ID],
  );

  // Upcoming Live Session for Tomorrow at 18:00
  const UPCOMING_SESSION_ID = 'cccccccc-cccc-4ccc-accc-cccccccccc01';
  await client.query(
    `INSERT INTO booking_sessions (
       id, booking_id, tutor_user_id, student_user_id, starts_at, ends_at, timezone, status, meeting_url
     )
     VALUES (
       $1, $2, '22222222-2222-4222-b222-222222222222', '33333333-3333-4333-b333-333333333333',
       now() + INTERVAL '1 day', now() + INTERVAL '1 day' + INTERVAL '1 hour', 'Asia/Dhaka',
       'scheduled', 'https://meet.google.com/ogr-phys-hsc'
     )
     ON CONFLICT (id) DO UPDATE
     SET status = 'scheduled', meeting_url = 'https://meet.google.com/ogr-phys-hsc';`,
    [UPCOMING_SESSION_ID, BOOKING_ID],
  );

  // Pending Assignment for Student
  const ASSIGNMENT_ID = 'dddddddd-dddd-4ddd-addd-dddddddddd01';
  await client.query(
    `INSERT INTO assignments (
       id, booking_id, session_id, tutor_user_id, student_user_id, title, instructions, due_at, max_score, status
     )
     VALUES (
       $1, $2, $3, '22222222-2222-4222-b222-222222222222', '33333333-3333-4333-b333-333333333333',
       'স্থির তড়িৎ — কুলম্বের সূত্র ও তড়িৎ ক্ষেত্রের প্রাবল্যের ৫টি গাণিতিক সমস্যা',
       'অনুশীলনী ২.১ এর উদাহরণ ৩ ও ৪ এবং সমস্যা ৫-৭ খাতায় সমাধান করে ছবি বা টেক্সট এখানে সাবমিট করবে।',
       now() + INTERVAL '3 days', 100.00, 'published'
     )
     ON CONFLICT (id) DO UPDATE
     SET title = EXCLUDED.title, instructions = EXCLUDED.instructions;`,
    [ASSIGNMENT_ID, BOOKING_ID, PAST_SESSION_ID],
  );
}
