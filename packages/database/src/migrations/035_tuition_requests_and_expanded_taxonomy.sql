-- ==============================================================================
-- OgroniEdu — Tuition Requests, Job Board & Universal Academic Taxonomy Migration (035)
-- Target: PostgreSQL 16+ / 18
-- Powers dynamic "Find Me a Tutor" request engine, admin matching desk, and expanded catalog
-- ==============================================================================

-- 1. Create sequence for human-readable tuition request references (e.g., TR-2026-00001)
CREATE SEQUENCE IF NOT EXISTS seq_tuition_request_ref START WITH 1 INCREMENT BY 1;

-- 2. Create tuition_requests table
CREATE TABLE IF NOT EXISTS tuition_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_reference TEXT NOT NULL UNIQUE DEFAULT ('TR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('seq_tuition_request_ref')::text, 5, '0')),
    guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_gender TEXT NOT NULL DEFAULT 'any' CHECK (student_gender IN ('male', 'female', 'other', 'any')),
    institution_name TEXT,
    curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    education_level_id UUID REFERENCES education_levels(id) ON DELETE SET NULL,
    stream_id UUID REFERENCES academic_streams(id) ON DELETE SET NULL,
    learning_mode TEXT NOT NULL CHECK (learning_mode IN ('in_person', 'online', 'hybrid')),
    division TEXT,
    district TEXT,
    area TEXT,
    address_details TEXT, -- Sensitive, hidden on public board
    days_per_week INTEGER CHECK (days_per_week BETWEEN 1 AND 7),
    preferred_days TEXT[] DEFAULT '{}',
    preferred_time TEXT,
    salary_budget_min BIGINT CHECK (salary_budget_min >= 0),
    salary_budget_max BIGINT CHECK (salary_budget_max >= salary_budget_min),
    salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'per_session')),
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    preferred_tutor_gender TEXT NOT NULL DEFAULT 'any' CHECK (preferred_tutor_gender IN ('male', 'female', 'any')),
    preferred_tutor_background TEXT,
    requirements_notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'demo_scheduled', 'confirmed', 'cancelled', 'closed')),
    is_vip BOOLEAN NOT NULL DEFAULT false,
    assigned_tutor_user_id UUID REFERENCES tutor_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tuition_requests_guardian ON tuition_requests(guardian_user_id, status);
CREATE INDEX IF NOT EXISTS ix_tuition_requests_status ON tuition_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_tuition_requests_assigned_tutor ON tuition_requests(assigned_tutor_user_id) WHERE assigned_tutor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_tuition_requests_geo ON tuition_requests(district, area) WHERE learning_mode <> 'online';

-- 3. Create tuition_request_subjects bridge table
CREATE TABLE IF NOT EXISTS tuition_request_subjects (
    request_id UUID NOT NULL REFERENCES tuition_requests(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, subject_id)
);

CREATE INDEX IF NOT EXISTS ix_tuition_request_subjects_sub ON tuition_request_subjects(subject_id);

-- 4. Create tuition_request_suggestions table (Admin / Platform Curated Match Suggestions)
CREATE TABLE IF NOT EXISTS tuition_request_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES tuition_requests(id) ON DELETE CASCADE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    suggested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    match_score INTEGER NOT NULL DEFAULT 85 CHECK (match_score BETWEEN 0 AND 100),
    admin_note TEXT,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted_by_guardian', 'declined_by_guardian', 'demo_scheduled', 'confirmed')),
    guardian_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (request_id, tutor_user_id)
);

CREATE INDEX IF NOT EXISTS ix_tuition_suggestions_request ON tuition_request_suggestions(request_id, status);
CREATE INDEX IF NOT EXISTS ix_tuition_suggestions_tutor ON tuition_request_suggestions(tutor_user_id, status);

-- 5. Create tuition_request_applications table (Tutors applying via Tuition Job Board)
CREATE TABLE IF NOT EXISTS tuition_request_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES tuition_requests(id) ON DELETE CASCADE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    cover_pitch TEXT NOT NULL,
    proposed_salary BIGINT,
    available_days TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted_by_admin', 'accepted', 'rejected', 'withdrawn')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (request_id, tutor_user_id)
);

CREATE INDEX IF NOT EXISTS ix_tuition_apps_request ON tuition_request_applications(request_id, status);
CREATE INDEX IF NOT EXISTS ix_tuition_apps_tutor ON tuition_request_applications(tutor_user_id, status);

-- 6. Expand curricula with all tracks for Bangladesh learning
INSERT INTO curricula (code, name_en, name_bn, board_name, is_active)
VALUES
    ('bangla_medium', 'National Curriculum (Bangla Medium)', 'জাতীয় শিক্ষাক্রম (বাংলা মাধ্যম)', 'NCTB', true),
    ('english_version', 'National Curriculum (English Version)', 'জাতীয় শিক্ষাক্রম (ইংলিশ ভার্সন)', 'NCTB', true),
    ('english_medium', 'English Medium (Cambridge / Edexcel / IB)', 'ইংলিশ মিডিয়াম (কেমব্রিজ / এডেক্সেল)', 'International', true),
    ('madrasah', 'Madrasah Education Board', 'মাদ্রাসা শিক্ষাক্রম (দাখিল/আলিম)', 'Madrasah Board', true),
    ('admission_prep', 'University & Medical Admission Prep', 'বিশ্ববিদ্যালয় ও মেডিকেল ভর্তি প্রস্তুতি', 'Higher Ed / Admission', true),
    ('university_higher_ed', 'University & Higher Education', 'বিশ্ববিদ্যালয় ও উচ্চশিক্ষা কোর্স', 'University UGC', true),
    ('language_learning', 'Language Learning & International Tests', 'ভাষা শিক্ষা ও টেস্ট প্রেপ (IELTS/আরবি/জার্মান)', 'Language & Test Boards', true),
    ('skills_development', 'Skills, Tech & Freelancing', 'স্কিলস, প্রযুক্তি ও ফ্রিল্যান্সিং', 'Professional & Tech', true),
    ('arts_and_hobbies', 'Arts, Music & Hobbies', 'শিল্প, সংগীত, চারুকলা ও দাবা', 'Creative & Performing Arts', true),
    ('special_education', 'Special Needs & Inclusive Care', 'বিশেষ চাহিদা সম্পন্ন শিশু ও ইনক্লুসিভ কেয়ার', 'Special Education', true)
ON CONFLICT (code) DO UPDATE
SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, board_name = EXCLUDED.board_name, is_active = true;

-- 7. Expand education_levels
INSERT INTO education_levels (code, name_en, name_bn, sort_order, is_active)
VALUES
    ('primary_1_5', 'Primary (Class 1-5)', 'প্রাথমিক (১ম-৫ম শ্রেণি)', 1, true),
    ('junior_6_8', 'Junior Secondary (Class 6-8)', 'নিম্ন মাধ্যমিক (৬ষ্ঠ-৮ম শ্রেণি)', 2, true),
    ('secondary_ssc', 'Secondary (Class 9-10 / SSC)', 'মাধ্যমিক (৯ম-১০ম শ্রেণি / এসএসসি)', 3, true),
    ('higher_hsc', 'Higher Secondary (Class 11-12 / HSC)', 'উচ্চ মাধ্যমিক (একাদশ-দ্বাদশ শ্রেণি / এইচএসসি)', 4, true),
    ('olevel_alevel', 'English Medium (O-Level / A-Level / IGCSE)', 'ইংলিশ মিডিয়াম (ও-লেভেল / এ-লেভেল)', 5, true),
    ('admission_prep', 'Admission Prep (BUET/Medical/DU/IBA)', 'বিশ্ববিদ্যালয় ও মেডিকেল ভর্তি প্রস্তুতি', 6, true),
    ('undergraduate', 'Undergraduate / College Degree Courses', 'স্নাতক / অনার্স / বিশ্ববিদ্যালয় লেভেল', 7, true),
    ('skills_all_ages', 'Skills, Language & Lifelong Learning', 'স্কিলস, ভাষা ও সকল বয়সের লার্নার', 8, true)
ON CONFLICT (code) DO UPDATE
SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, sort_order = EXCLUDED.sort_order, is_active = true;

-- 8. Expand subjects across all categories
INSERT INTO subjects (code, name_en, name_bn, category, is_active)
VALUES
    -- General Academic
    ('math_general', 'General Mathematics', 'সাধারণ গণিত', 'academic', true),
    ('math_higher', 'Higher Mathematics', 'উচ্চতর গণিত', 'academic', true),
    ('physics', 'Physics', 'পদার্থবিজ্ঞান', 'academic', true),
    ('chemistry', 'Chemistry', 'রসায়ন', 'academic', true),
    ('biology', 'Biology', 'জীববিজ্ঞান', 'academic', true),
    ('english', 'English (1st & 2nd Paper)', 'ইংরেজি (১ম ও ২য় পত্র)', 'academic', true),
    ('bangla', 'Bangla (1st & 2nd Paper)', 'বাংলা (১ম ও ২য় পত্র)', 'academic', true),
    ('ict', 'Information & Communication Tech (ICT)', 'তথ্য ও যোগাযোগ প্রযুক্তি (আইসিটি)', 'academic', true),
    ('accounting', 'Accounting', 'হিসাববিজ্ঞান', 'academic', true),
    ('finance_banking', 'Finance & Banking', 'ফিন্যান্স ও ব্যাংকিং', 'academic', true),
    ('economics', 'Economics', 'অর্থনীতি', 'academic', true),
    ('business_org', 'Business Organization & Management', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'academic', true),
    ('general_science', 'General Science (Class 1-8)', 'সাধারণ বিজ্ঞান', 'academic', true),
    ('social_studies', 'Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্বপরিচয়', 'academic', true),
    ('islamic_studies', 'Islamic Studies', 'ইসলাম শিক্ষা', 'academic', true),

    -- Admission Prep
    ('buet_engineering_prep', 'Engineering Admission (BUET, CKRUET)', 'বুয়েট ও ইঞ্জিনিয়ারিং ভর্তি প্রস্তুতি', 'admission', true),
    ('medical_dental_prep', 'Medical & Dental Admission (DMC/BDS)', 'মেডিকেল ও ডেন্টাল ভর্তি প্রস্তুতি', 'admission', true),
    ('varsity_ka_prep', 'DU Unit A (Science) Admission', 'ঢাবি ক ইউনিট (বিজ্ঞান) ভর্তি প্রস্তুতি', 'admission', true),
    ('varsity_kha_prep', 'DU Unit B (Humanities) Admission', 'ঢাবি খ ইউনিট (মানবিক) ভর্তি প্রস্তুতি', 'admission', true),
    ('varsity_ga_prep', 'DU Unit C (Business) Admission', 'ঢাবি গ ইউনিট (ব্যবসায়) ভর্তি প্রস্তুতি', 'admission', true),
    ('iba_bba_prep', 'IBA / BBA Admission Prep (DU, BUP)', 'আইবিএ ও বিইউপি ভর্তি প্রস্তুতি', 'admission', true),
    ('cadet_college_prep', 'Cadet College Admission (Class 6-7)', 'ক্যাডেট কলেজ ভর্তি প্রস্তুতি', 'admission', true),

    -- University Courses
    ('cs_programming', 'Data Structures, Algorithms & OOP (CSE)', 'সিএসই অ্যালগরিদম ও ডেটা স্ট্রাকচার', 'university', true),
    ('ee_circuits', 'Electrical Circuits & Electronics (EEE)', 'ইলেকট্রিক্যাল সার্কিট ও ইলেকট্রনিক্স', 'university', true),
    ('math_calculus', 'Calculus, Linear Algebra & Differential Equations', 'ক্যালকুলাস ও লিনিয়ার অ্যালজেব্রা', 'university', true),
    ('medical_mbbs', 'MBBS Basic Sciences (Anatomy, Physiology)', 'এমবিবিএস অ্যানাটমি ও ফিজিওলজি', 'university', true),
    ('bba_accounting', 'Financial & Managerial Accounting (BBA)', 'ফিন্যান্সিয়াল অ্যাকাউন্টিং ও ফিন্যান্স', 'university', true),

    -- Language & Test Prep
    ('ielts_prep', 'IELTS Academic & General (All 4 Modules)', 'আইইএলটিএস প্রস্তুতি (স্পিকিং, রাইটিং, লিসেনিং, রিডিং)', 'language', true),
    ('spoken_english', 'Spoken & Communicative English', 'স্পোকেন ও কনভারসেশনাল ইংলিশ', 'language', true),
    ('quran_tajweed', 'Quran Reading, Tajweed & Hifz', 'কুরআন শিক্ষা, সহীহ তাজবীদ ও হিফজ', 'language', true),
    ('arabic_language', 'Arabic Language & Grammar', 'আরবি ভাষা ও ব্যাকরণ', 'language', true),
    ('german_language', 'German Language (A1-B2 Goethe)', 'জার্মান ভাষা শিক্ষা', 'language', true),
    ('japanese_language', 'Japanese Language (JLPT N5-N3)', 'জাপানিজ ভাষা শিক্ষা', 'language', true),

    -- Skills & Tech
    ('web_development', 'Web Development (HTML/CSS/JS/React/Next.js)', 'ফুলস্ট্যাক ওয়েব ডেভেলপমেন্ট', 'skills', true),
    ('python_coding', 'Python Programming & Data Science', 'পাইথন প্রোগ্রামিং ও ডেটা সায়েন্স', 'skills', true),
    ('graphic_design', 'Graphic Design & Photoshop/Illustrator', 'গ্রাফিক্স ডিজাইন ও ব্র্যান্ডিং', 'skills', true),
    ('video_editing', 'Video Editing & Motion Graphics', 'ভিডিও এডিটিং ও মোশন গ্রাফিক্স', 'skills', true),
    ('digital_marketing', 'Digital Marketing & Freelancing', 'ডিজিটাল মার্কেটিং ও ফ্রিল্যান্সিং', 'skills', true),
    ('ms_office_excel', 'Advanced Excel & PowerPoint', 'অ্যাডভান্সড এক্সেল ও অফিস স্কিলস', 'skills', true),

    -- Arts & Hobbies
    ('guitar_instrument', 'Guitar (Acoustic / Electric)', 'গিটার শিক্ষা (একোস্টিক ও ইলেকট্রিক)', 'creative', true),
    ('keyboard_piano', 'Keyboard & Piano', 'কিবোর্ড ও পিয়ানো', 'creative', true),
    ('vocal_music', 'Vocal Music & Singing', 'কণ্ঠসংগীত ও সুর সাধনা', 'creative', true),
    ('drawing_art', 'Fine Arts, Drawing & Painting', 'চিত্রাঙ্কন ও চারুকলা', 'creative', true),
    ('chess_training', 'Chess Strategy & Tactics', 'দাবা খেলা ও কৌশল', 'creative', true),

    -- Special Education
    ('autism_support', 'Autism Care & Behavioral Support', 'অটিজম কেয়ার ও বিশেষ যত্ন', 'special_care', true),
    ('speech_therapy', 'Speech Development & Communication', 'স্পিচ ও ভাষা বিকাশ থেরাপি', 'special_care', true)
ON CONFLICT (code) DO UPDATE
SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, category = EXCLUDED.category, is_active = true;
