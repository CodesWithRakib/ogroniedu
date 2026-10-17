-- ==============================================================================
-- OgroniEdu — Dynamic Academic Streams & Institutions Migration (015)
-- Target: PostgreSQL 16+ / 18
-- Adds dynamic academic streams and real Bangladesh institutions managed by Admin
-- ==============================================================================

-- 1. Create academic_streams table
CREATE TABLE IF NOT EXISTS academic_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_academic_streams_active_sort ON academic_streams(is_active, sort_order);

-- 2. Create academic_institutions table
CREATE TABLE IF NOT EXISTS academic_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'school_and_college' CHECK (type IN ('school', 'college', 'school_and_college', 'university', 'madrasah')),
    district TEXT,
    division TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_academic_institutions_type ON academic_institutions(type);
CREATE INDEX IF NOT EXISTS ix_academic_institutions_district ON academic_institutions(district);
CREATE INDEX IF NOT EXISTS ix_academic_institutions_active_sort ON academic_institutions(is_active, sort_order);

-- 3. Seed Realistic Bangladesh Academic Streams
INSERT INTO academic_streams (code, name_en, name_bn, description, sort_order)
VALUES
    ('science', 'Science', 'বিজ্ঞান বিভাগ', 'Physics, Chemistry, Biology & Higher Mathematics', 1),
    ('business_studies', 'Business Studies / Commerce', 'ব্যবসায় শিক্ষা / বাণিজ্য বিভাগ', 'Accounting, Finance, Business Org & Management', 2),
    ('humanities', 'Humanities / Arts', 'মানবিক / কলা বিভাগ', 'Economics, Civics, History, Geography & Logic', 3),
    ('general', 'General / Integrated', 'সাধারণ / সমন্বিত শাখা', 'General foundation curriculum for Classes 1 to 8', 4),
    ('vocational', 'Vocational / Technical', 'কারিগরি ও ভোকেশনাল শাখা', 'Technical and applied vocational subjects (BTEB)', 5),
    ('islamic_studies', 'Islamic Studies', 'ইসলামিক স্টাডিজ ও কুরআন/হাদিস শাখা', 'Quran, Hadith, Fiqh and Arabic language curriculum', 6)
ON CONFLICT (code) DO UPDATE
SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- 4. Seed Comprehensive Real Bangladesh Institutions
INSERT INTO academic_institutions (code, name_en, name_bn, type, district, division, sort_order)
VALUES
    -- Dhaka Top Schools & Colleges
    ('ndc_dhaka', 'Notre Dame College, Dhaka', 'নটর ডেম কলেজ, ঢাকা', 'college', 'Dhaka', 'Dhaka', 1),
    ('vnsc_dhaka', 'Viqarunnisa Noon School & College', 'ভিকারুননিসা নূন স্কুল অ্যান্ড কলেজ', 'school_and_college', 'Dhaka', 'Dhaka', 2),
    ('rumc_dhaka', 'Rajuk Uttara Model College', 'রাজউক উত্তরা মডেল কলেজ', 'school_and_college', 'Dhaka', 'Dhaka', 3),
    ('drmc_dhaka', 'Dhaka Residential Model College', 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ', 'school_and_college', 'Dhaka', 'Dhaka', 4),
    ('hcc_dhaka', 'Holy Cross College, Dhaka', 'হলি ক্রস কলেজ, ঢাকা', 'college', 'Dhaka', 'Dhaka', 5),
    ('sjs_dhaka', 'St. Joseph Higher Secondary School', 'সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়', 'school_and_college', 'Dhaka', 'Dhaka', 6),
    ('ideal_motijheel', 'Ideal School and College, Motijheel', 'আইডিয়াল স্কুল অ্যান্ড কলেজ, মতিঝিল', 'school_and_college', 'Dhaka', 'Dhaka', 7),
    ('dhaka_college', 'Dhaka College', 'ঢাকা কলেজ', 'college', 'Dhaka', 'Dhaka', 8),
    ('adamjee_cantonment', 'Adamjee Cantonment College', 'আদমজী ক্যান্টনমেন্ট কলেজ', 'college', 'Dhaka', 'Dhaka', 9),
    ('milestone_college', 'Milestone College, Uttara', 'মাইলস্টোন কলেজ, উত্তরা', 'school_and_college', 'Dhaka', 'Dhaka', 10),
    ('bnmpc_dhaka', 'Birshreshtha Noor Mohammad Public College', 'বীরশ্রেষ্ঠ নূর মোহাম্মদ পাবলিক কলেজ', 'school_and_college', 'Dhaka', 'Dhaka', 11),
    ('baf_shaheen_dhaka', 'BAF Shaheen College, Dhaka', 'বিএএফ শাহীন কলেজ ঢাকা', 'school_and_college', 'Dhaka', 'Dhaka', 12),
    ('scholastica', 'Scholastica School', 'স্কলাস্টিকা', 'school', 'Dhaka', 'Dhaka', 13),
    ('mastermind', 'Mastermind English Medium School', 'মাস্টারমাইন্ড স্কুল', 'school', 'Dhaka', 'Dhaka', 14),
    ('sunbeams', 'Sunbeams School', 'সানবিমস স্কুল', 'school', 'Dhaka', 'Dhaka', 15),
    ('isd_dhaka', 'International School Dhaka (ISD)', 'ইন্টারন্যাশনাল স্কুল ঢাকা', 'school', 'Dhaka', 'Dhaka', 16),
    ('tamirul_millat', 'Tamirul Millat Kamil Madrasah', 'তামীরুল মিল্লাত কামিল মাদ্রাসা', 'madrasah', 'Dhaka', 'Dhaka', 17),

    -- Chattogram Top Institutions
    ('chittagong_college', 'Chittagong College', 'চট্টগ্রাম কলেজ', 'college', 'Chattogram', 'Chattogram', 18),
    ('haji_mohsin_ctg', 'Govt. Hazi Mohammad Mohsin College', 'সরকারি হাজী মুহাম্মদ মহসিন কলেজ, চট্টগ্রাম', 'college', 'Chattogram', 'Chattogram', 19),
    ('faujdarhat_cadet', 'Faujdarhat Cadet College', 'ফৌজদারহাট ক্যাডেট কলেজ', 'school_and_college', 'Chattogram', 'Chattogram', 20),
    ('ispahani_ctg', 'Ispahani Public School and College', 'ইস্পাহানী পাবলিক স্কুল অ্যান্ড কলেজ', 'school_and_college', 'Chattogram', 'Chattogram', 21),

    -- Rajshahi, Sylhet & Other Divisions
    ('rajshahi_college', 'Rajshahi College', 'রাজশাহী কলেজ', 'college', 'Rajshahi', 'Rajshahi', 22),
    ('rajshahi_cadet', 'Rajshahi Cadet College', 'রাজশাহী ক্যাডেট কলেজ', 'school_and_college', 'Rajshahi', 'Rajshahi', 23),
    ('sylhet_mc_college', 'Sylhet MC College', 'সিলেট এম সি কলেজ', 'college', 'Sylhet', 'Sylhet', 24),
    ('jalalabad_cantonment', 'Jalalabad Cantonment Public School & College', 'জালালাবাদ ক্যান্টনমেন্ট পাবলিক স্কুল অ্যান্ড কলেজ', 'school_and_college', 'Sylhet', 'Sylhet', 25),
    ('bm_college_barishal', 'Govt. Brojomohun (BM) College', 'সরকারি ব্রজমোহন কলেজ, বরিশাল', 'college', 'Barishal', 'Barishal', 26),
    ('carmichael_rangpur', 'Carmichael College, Rangpur', 'কারমাইকেল কলেজ, রংপুর', 'college', 'Rangpur', 'Rangpur', 27),
    ('ananda_mohan_mym', 'Ananda Mohan College, Mymensingh', 'আনন্দ মোহন কলেজ, ময়মনসিংহ', 'college', 'Mymensingh', 'Mymensingh', 28),
    ('victoria_comilla', 'Comilla Victoria Government College', 'কুমিল্লা ভিক্টোরিয়া সরকারি কলেজ', 'college', 'Cumilla', 'Chattogram', 29),
    ('mirzapur_cadet', 'Mirzapur Cadet College', 'মির্জাপুর ক্যাডেট কলেজ', 'school_and_college', 'Tangail', 'Dhaka', 30),

    -- Top Public & Engineering Universities (For Admission prep & Higher Ed)
    ('buet', 'Bangladesh University of Engineering and Technology (BUET)', 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট)', 'university', 'Dhaka', 'Dhaka', 31),
    ('du', 'University of Dhaka', 'ঢাকা বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 32),
    ('dmc', 'Dhaka Medical College', 'ঢাকা মেডিকেল কলেজ', 'university', 'Dhaka', 'Dhaka', 33),
    ('iba_du', 'Institute of Business Administration (IBA - DU)', 'আইবিএ, ঢাকা বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 34),
    ('ruet', 'Rajshahi University of Engineering and Technology (RUET)', 'রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'university', 'Rajshahi', 'Rajshahi', 35),
    ('cuet', 'Chittagong University of Engineering and Technology (CUET)', 'চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'university', 'Chattogram', 'Chattogram', 36),
    ('kuet', 'Khulna University of Engineering and Technology (KUET)', 'খুলনা প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', 'university', 'Khulna', 'Khulna', 37),
    ('sust', 'Shahjalal University of Science and Technology (SUST)', 'শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'university', 'Sylhet', 'Sylhet', 38),
    ('ju', 'Jahangirnagar University', 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 39),
    ('nsu', 'North South University (NSU)', 'নর্থ সাউথ বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 40),
    ('bracu', 'BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 41),
    ('aust', 'Ahsanullah University of Science and Technology (AUST)', 'আহছানউল্লা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', 'university', 'Dhaka', 'Dhaka', 42)
ON CONFLICT (code) DO UPDATE
SET name_en = EXCLUDED.name_en, name_bn = EXCLUDED.name_bn, type = EXCLUDED.type, district = EXCLUDED.district, division = EXCLUDED.division, sort_order = EXCLUDED.sort_order;
