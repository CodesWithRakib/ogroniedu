import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ogroniedu_dev',
  });

  await client.connect();
  console.log('Connected to Postgres database...');

  try {
    await client.query('BEGIN');

    // 0. Ensure avatar_url columns exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    // Fetch Subject and Education Level IDs
    const subsRes = await client.query('SELECT id, code FROM subjects');
    const subMap = new Map(subsRes.rows.map(r => [r.code, r.id]));

    const lvlsRes = await client.query('SELECT id, code FROM education_levels');
    const lvlMap = new Map(lvlsRes.rows.map(r => [r.code, r.id]));

    const rolesRes = await client.query('SELECT id, code FROM roles WHERE code = $1', ['tutor']);
    const tutorRoleId = rolesRes.rows[0]?.id;

    // Password hash for demo users
    const DEMO_PASSWORD_HASH = '$2b$10$epR.1gV00G84r37c569n3e12MhS4bV6P3eW9lQ6rL5zO4kY8uJ5e.';

    const tutors = [
      {
        id: '22222222-2222-4222-b222-222222222222',
        email: 'tutor.demo@ogroniedu.com',
        phone: '+8801711000002',
        name: 'রাশেদ করিম (Rashed Karim)',
        avatarUrl: '/images/tutors/tutor-rashed.jpg',
        headline: 'বুয়েট সিভিল ইঞ্জিনিয়ারিং | এইচএসসি ও এসএসসি পদার্থবিজ্ঞান ও উচ্চতর গণিত বিশেষজ্ঞ',
        bio: `আসসালামু আলাইকুম। আমি রাশেদ করিম, বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট) থেকে সিভিল ইঞ্জিনিয়ারিং সম্পন্ন করেছি। গত ৫ বছর ধরে এইচএসসি ও এসএসসি স্তরের শিক্ষার্থীদের পদার্থবিজ্ঞান ও উচ্চতর গণিত পড়াচ্ছি।

আমার পাঠদানের মূল দর্শন হলো—শুধু সূত্র মুখস্থ না করিয়ে প্রতিটি সূত্রের পেছনের বৈজ্ঞানিক কারণ ও বাস্তব প্রয়োগ বুঝিয়ে দেওয়া। বিগত বছরগুলোতে আমার বহু শিক্ষার্থী বুয়েট, ঢাবি এবং বিভিন্ন পাবলিক বিশ্ববিদ্যালয়ে কৃতিত্বের সাথে সুযোগ পেয়েছে। দুর্বল শিক্ষার্থীদের বিশেষ যত্ন ও উইকলি মডেল টেস্টের মাধ্যমে প্রস্তুতি নিশ্চিত করি।`,
        yearsExp: 5,
        modes: ['in_person', 'online', 'hybrid'],
        rateMinor: 120000,
        qualifications: [
          {
            id: 'aaaa1111-1111-4aaa-baaa-111111111101',
            type: 'nid',
            title: 'জাতীয় পরিচয়পত্র (NID) — বাংলাদেশ নির্বাচন কমিশন',
            institution: 'EC Bangladesh',
            year: 2020,
          },
          {
            id: 'aaaa1111-1111-4aaa-baaa-111111111102',
            type: 'degree',
            title: 'বি.এস.সি. ইন সিভিল ইঞ্জিনিয়ারিং (B.Sc. in Civil Engineering)',
            institution: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (BUET)',
            year: 2023,
          },
          {
            id: 'aaaa1111-1111-4aaa-baaa-111111111103',
            type: 'academic_certificate',
            title: 'এইচএসসি বিজ্ঞান বিভাগ (HSC Science)',
            institution: 'নটর ডেম কলেজ, ঢাকা',
            year: 2018,
          },
          {
            id: 'aaaa1111-1111-4aaa-baaa-111111111104',
            type: 'academic_certificate',
            title: 'এসএসসি বিজ্ঞান বিভাগ (SSC Science)',
            institution: 'মতিঝিল আইডিয়াল স্কুল অ্যান্ড কলেজ',
            year: 2016,
          },
        ],
        subjects: [
          { sub: 'physics', lvl: 'higher_hsc' },
          { sub: 'math_higher', lvl: 'higher_hsc' },
          { sub: 'physics', lvl: 'secondary_ssc' },
          { sub: 'math_general', lvl: 'secondary_ssc' },
        ],
        areas: [
          { district: 'dhaka', locality: 'ধানমন্ডি ও কলাবাগান', radius: 5.0 },
          { district: 'dhaka', locality: 'মোহাম্মদপুর ও লালমাটিয়া', radius: 6.0 },
          { district: 'dhaka', locality: 'ফার্মগেট ও গ্রিন রোড', radius: 4.5 },
        ],
        availability: [
          { weekday: 6, start: '17:00:00', end: '21:00:00' },
          { weekday: 1, start: '17:00:00', end: '21:00:00' },
          { weekday: 3, start: '17:00:00', end: '21:00:00' },
          { weekday: 5, start: '09:30:00', end: '12:30:00' },
        ],
        reviews: [
          {
            id: 'eeee1111-1111-4eee-beee-111111111101',
            reviewerId: '33333333-3333-4333-b333-333333333333',
            rating: 5,
            comment: 'রাশেদ ভাইয়ার স্থির তড়িৎ ও গতিবিদ্যার ক্লাসগুলো অসাধারণ ছিল। জটিল কনসেপ্টগুলো খুব সহজ বাস্তব উদাহরণ দিয়ে মাথায় ঢুকিয়ে দেন। টেস্ট পরীক্ষায় ফিজিক্সে হাইয়েস্ট পেয়েছি!',
            reply: 'অনেক ধন্যবাদ আবরার! তোমার নিয়মিত প্র্যাকটিস এবং নিষ্ঠাই ভালো রেজাল্টের মূল কারণ। শুভকামনা!',
          },
        ],
      },
      {
        id: '44444444-4444-4444-b444-444444444444',
        email: 'nusrat.tutor@ogroniedu.com',
        phone: '+8801711000004',
        name: 'ডা. নুসরাত জাহান (Dr. Nusrat Jahan)',
        avatarUrl: '/images/tutors/tutor-nusrat.jpg',
        headline: 'ঢাকা মেডিকেল কলেজ (DMC) | এইচএসসি জীববিজ্ঞান ও রসায়ন মেন্টর',
        bio: `আসসালামু আলাইকুম। আমি ডা. নুসরাত জাহান, ঢাকা মেডিকেল কলেজ (DMC) থেকে এমবিবিএস সম্পন্ন করেছি। মেডিকেল ভর্তি পরীক্ষা এবং বোর্ড পরীক্ষার জীববিজ্ঞান ও রসায়নে সর্বোচ্চ নম্বর তোলার জন্য কনসেপ্ট ক্লিয়ারিংয়ের পাশাপাশি স্পেশাল মেমোরি টেকনিক ও ডায়াগ্রাম প্র্যাকটিস করাই।

প্রতিটি ক্লাসে অধ্যায়ভিত্তিক বিগত বছরের বোর্ড ও মেডিকেল প্রশ্ন সলভ করানো হয়, যা শিক্ষার্থীদের আত্মবিশ্বাস বহুগুণ বাড়িয়ে তোলে।`,
        yearsExp: 4,
        modes: ['in_person', 'online'],
        rateMinor: 150000,
        qualifications: [
          {
            id: 'aaaa2222-2222-4aaa-baaa-222222222201',
            type: 'nid',
            title: 'জাতীয় পরিচয়পত্র (NID) — বাংলাদেশ নির্বাচন কমিশন',
            institution: 'EC Bangladesh',
            year: 2020,
          },
          {
            id: 'aaaa2222-2222-4aaa-baaa-222222222202',
            type: 'degree',
            title: 'ব্যাচেলর অব মেডিসিন অ্যান্ড ব্যাচেলর অব সার্জারি (MBBS)',
            institution: 'ঢাকা মেডিকেল কলেজ (DMC)',
            year: 2024,
          },
          {
            id: 'aaaa2222-2222-4aaa-baaa-222222222203',
            type: 'academic_certificate',
            title: 'এইচএসসি বিজ্ঞান বিভাগ (HSC Science)',
            institution: 'ভিকারুননিসা নূন স্কুল অ্যান্ড কলেজ',
            year: 2018,
          },
        ],
        subjects: [
          { sub: 'biology', lvl: 'higher_hsc' },
          { sub: 'chemistry', lvl: 'higher_hsc' },
          { sub: 'biology', lvl: 'secondary_ssc' },
          { sub: 'biology', lvl: 'admission_prep' },
        ],
        areas: [
          { district: 'dhaka', locality: 'শান্তিনগর, সিদ্ধেশ্বরী ও বেইলি রোড', radius: 4.0 },
          { district: 'dhaka', locality: 'ধানমন্ডি ও আজিমপুর', radius: 5.5 },
        ],
        availability: [
          { weekday: 0, start: '16:00:00', end: '20:00:00' },
          { weekday: 2, start: '16:00:00', end: '20:00:00' },
          { weekday: 4, start: '16:00:00', end: '20:00:00' },
        ],
        reviews: [],
      },
      {
        id: '55555555-5555-4555-b555-555555555555',
        email: 'tanvir.tutor@ogroniedu.com',
        phone: '+8801711000005',
        name: 'তানভীর আহমেদ (Tanvir Ahmed)',
        avatarUrl: '/images/tutors/tutor-tanvir.jpg',
        headline: 'ঢাকা বিশ্ববিদ্যালয় (DU CSE) | এইচএসসি আইসিটি ও গণিত প্রশিক্ষক',
        bio: `ঢাকা বিশ্ববিদ্যালয়ের কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং (CSE) বিভাগ থেকে গ্র্যাজুয়েশন সম্পন্ন করেছি। গত ৪ বছর ধরে শিক্ষার্থীদের সি প্রোগ্রামিং, এইচটিএমএল, এসকিউএল এবং এইচএসসি আইসিটির পুরো সিলেবাস প্র্যাক্টিক্যাল কোডিং সহকারে পড়াচ্ছি।

এছাড়াও মাধ্যমিক ও উচ্চমাধ্যমিক গণিতের বীজগণিত ও ক্যালকুলাসে শিক্ষার্থীদের ভিত মজবুত করতে নিবিড় গাইডলাইন দিয়ে থাকি।`,
        yearsExp: 4,
        modes: ['online', 'in_person'],
        rateMinor: 100000,
        qualifications: [
          {
            id: 'aaaa3333-3333-4aaa-baaa-333333333301',
            type: 'nid',
            title: 'জাতীয় পরিচয়পত্র (NID) — বাংলাদেশ নির্বাচন কমিশন',
            institution: 'EC Bangladesh',
            year: 2021,
          },
          {
            id: 'aaaa3333-3333-4aaa-baaa-333333333302',
            type: 'degree',
            title: 'বি.এস.সি. ইন সিএসই (B.Sc. in CSE)',
            institution: 'ঢাকা বিশ্ববিদ্যালয় (University of Dhaka)',
            year: 2023,
          },
          {
            id: 'aaaa3333-3333-4aaa-baaa-333333333303',
            type: 'academic_certificate',
            title: 'এইচএসসি বিজ্ঞান বিভাগ (HSC Science)',
            institution: 'ঢাকা কলেজ',
            year: 2018,
          },
        ],
        subjects: [
          { sub: 'ict', lvl: 'higher_hsc' },
          { sub: 'math_general', lvl: 'higher_hsc' },
          { sub: 'math_general', lvl: 'secondary_ssc' },
        ],
        areas: [
          { district: 'dhaka', locality: 'উত্তরা ও এয়ারপোর্ট', radius: 6.0 },
          { district: 'dhaka', locality: 'বনানী, গুলশান ও বারিধারা', radius: 7.0 },
        ],
        availability: [
          { weekday: 6, start: '18:00:00', end: '22:00:00' },
          { weekday: 0, start: '18:00:00', end: '22:00:00' },
          { weekday: 2, start: '18:00:00', end: '22:00:00' },
          { weekday: 3, start: '18:00:00', end: '22:00:00' },
        ],
        reviews: [],
      },
      {
        id: '66666666-6666-4666-b666-666666666666',
        email: 'sadia.tutor@ogroniedu.com',
        phone: '+8801711000006',
        name: 'সাদিয়া রহমান (Sadia Rahman)',
        avatarUrl: '/images/tutors/tutor-sadia.jpg',
        headline: 'ঢাকা বিশ্ববিদ্যালয় (ইংরেজি বিভাগ) | এইচএসসি ও এসএসসি ইংরেজি স্পেশালিস্ট',
        bio: `ঢাকা বিশ্ববিদ্যালয় থেকে ইংরেজি সাহিত্যে বিএ (অনার্স) ও এমএ সম্পন্ন করেছি। গ্রামারের কঠিন নিয়মাবলী সহজ বাংলা উদাহরণের মাধ্যমে প্রাঞ্জলভাবে উপস্থাপন করাই আমার স্পেশালিটি।

ফ্রি-হ্যান্ড রাইটিং, রিডিং কমপ্রিহেনশন এবং বোর্ড পরীক্ষার স্টাইলিশ ও ত্রুটিমুক্ত উত্তর লেখার টেকনিক শেখাই। আইইএলটিএস বেসিক প্রস্তুতিও দিয়ে থাকি।`,
        yearsExp: 5,
        modes: ['in_person', 'online', 'hybrid'],
        rateMinor: 110000,
        qualifications: [
          {
            id: 'aaaa4444-4444-4aaa-baaa-444444444401',
            type: 'nid',
            title: 'জাতীয় পরিচয়পত্র (NID) — বাংলাদেশ নির্বাচন কমিশন',
            institution: 'EC Bangladesh',
            year: 2020,
          },
          {
            id: 'aaaa4444-4444-4aaa-baaa-444444444402',
            type: 'degree',
            title: 'এম.এ. ইন ইংলিশ (M.A. in English)',
            institution: 'ঢাকা বিশ্ববিদ্যালয় (University of Dhaka)',
            year: 2023,
          },
          {
            id: 'aaaa4444-4444-4aaa-baaa-444444444403',
            type: 'degree',
            title: 'বি.এ. অনার্স ইন ইংলিশ (B.A. Hons in English)',
            institution: 'ঢাকা বিশ্ববিদ্যালয়',
            year: 2022,
          },
          {
            id: 'aaaa4444-4444-4aaa-baaa-444444444404',
            type: 'academic_certificate',
            title: 'এইচএসসি মানবিক বিভাগ (HSC Humanities)',
            institution: 'হলি ক্রস কলেজ',
            year: 2017,
          },
        ],
        subjects: [
          { sub: 'english', lvl: 'higher_hsc' },
          { sub: 'english', lvl: 'secondary_ssc' },
          { sub: 'english', lvl: 'admission_prep' },
        ],
        areas: [
          { district: 'dhaka', locality: 'ধানমন্ডি ও লালমাটিয়া', radius: 5.0 },
          { district: 'dhaka', locality: 'মোহাম্মদপুর ও শ্যামলী', radius: 5.0 },
          { district: 'dhaka', locality: 'গুলশান ও বনানী', radius: 8.0 },
        ],
        availability: [
          { weekday: 6, start: '15:00:00', end: '19:00:00' },
          { weekday: 1, start: '15:00:00', end: '19:00:00' },
          { weekday: 3, start: '15:00:00', end: '19:00:00' },
          { weekday: 4, start: '15:00:00', end: '19:00:00' },
        ],
        reviews: [],
      },
    ];

    for (const t of tutors) {
      console.log(`Seeding tutor: ${t.name}...`);
      // 1. User
      await client.query(`
        INSERT INTO users (id, email, phone_e164, password_hash, display_name, avatar_url, preferred_locale, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'bn', 'active')
        ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            status = 'active';
      `, [t.id, t.email, t.phone, DEMO_PASSWORD_HASH, t.name, t.avatarUrl]);

      // 2. Role
      if (tutorRoleId) {
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        `, [t.id, tutorRoleId]);
      }

      // 3. Tutor Profile
      await client.query(`
        INSERT INTO tutor_profiles (
          user_id, headline, bio, years_experience, teaching_modes,
          hourly_rate_minor, currency, verification_status, publication_status, avatar_url, response_time_minutes
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'BDT', 'approved', 'published', $7, 25)
        ON CONFLICT (user_id) DO UPDATE
        SET headline = EXCLUDED.headline,
            bio = EXCLUDED.bio,
            years_experience = EXCLUDED.years_experience,
            teaching_modes = EXCLUDED.teaching_modes,
            hourly_rate_minor = EXCLUDED.hourly_rate_minor,
            verification_status = 'approved',
            publication_status = 'published',
            avatar_url = EXCLUDED.avatar_url,
            response_time_minutes = 25;
      `, [t.id, t.headline, t.bio, t.yearsExp, t.modes, t.rateMinor, t.avatarUrl]);

      // 4. Qualifications
      for (const q of t.qualifications) {
        await client.query(`
          INSERT INTO tutor_qualifications (id, tutor_user_id, qualification_type, title, institution, issued_year, review_status)
          VALUES ($1, $2, $3, $4, $5, $6, 'approved')
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              institution = EXCLUDED.institution,
              review_status = 'approved';
        `, [q.id, t.id, q.type, q.title, q.institution, q.year]);
      }

      // 5. Subjects
      for (const s of t.subjects) {
        const subId = subMap.get(s.sub);
        const lvlId = lvlMap.get(s.lvl);
        if (subId && lvlId) {
          await client.query(`
            INSERT INTO tutor_subjects (tutor_user_id, subject_id, education_level_id, rate_minor, currency)
            SELECT $1, $2, $3, $4, 'BDT'
            WHERE NOT EXISTS (
              SELECT 1 FROM tutor_subjects
              WHERE tutor_user_id = $1 AND subject_id = $2 AND education_level_id = $3
            );
          `, [t.id, subId, lvlId, t.rateMinor]);
        }
      }

      // 6. Service Areas
      await client.query('DELETE FROM tutor_service_areas WHERE tutor_user_id = $1', [t.id]);
      for (const a of t.areas) {
        await client.query(`
          INSERT INTO tutor_service_areas (tutor_user_id, district_code, locality_name, radius_km)
          VALUES ($1, $2, $3, $4);
        `, [t.id, a.district, a.locality, a.radius]);
      }

      // 7. Availability
      await client.query('DELETE FROM tutor_availability WHERE tutor_user_id = $1', [t.id]);
      for (const av of t.availability) {
        await client.query(`
          INSERT INTO tutor_availability (tutor_user_id, weekday, start_local, end_local, timezone, is_active)
          VALUES ($1, $2, $3, $4, 'Asia/Dhaka', true);
        `, [t.id, av.weekday, av.start, av.end]);
      }

      // 8. Reviews
      for (const r of t.reviews) {
        await client.query(`
          INSERT INTO reviews (
            id, booking_id, reviewer_user_id, tutor_user_id, rating,
            punctuality_rating, teaching_clarity_rating, subject_mastery_rating,
            comment, moderation_status, tutor_response, tutor_responded_at
          )
          VALUES (
            $1, 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbb01', $2, $3, $4,
            5, 5, 5,
            $5, 'published', $6, now() - INTERVAL '1 day'
          )
          ON CONFLICT (id) DO UPDATE
          SET comment = EXCLUDED.comment,
              tutor_response = EXCLUDED.tutor_response;
        `, [r.id, r.reviewerId, t.id, r.rating, r.comment, r.reply]);
      }
    }

    await client.query('COMMIT');
    console.log('Successfully seeded 4 authentic educators with full details!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
