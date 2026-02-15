-- Batch 1/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972542235096@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542235096',
    '{"full_name": "דניאל קטנוב", "phone_number": "+972542235096"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972542465462@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542465462',
    '{"full_name": "נועה צימרינג", "phone_number": "+972542465462"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972548058842@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972548058842',
    '{"full_name": "עתי דניאל", "phone_number": "+972548058842"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'avivi1303@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972586272022',
    '{"full_name": "אביב אבקסיס", "phone_number": "+972586272022"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'avital148@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972544254994',
    '{"full_name": "אביטל שוורצמן", "phone_number": "+972544254994"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-06-11T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'evyatarmalka10@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972538234398',
    '{"full_name": "אביתר מלכה", "phone_number": "+972538234398"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Oritbiton35@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972536229393',
    '{"full_name": "אורית ביטון", "phone_number": "+972536229393"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-03-02T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ayeletshafir7@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972507872797',
    '{"full_name": "איילת שפיר", "phone_number": "+972507872797"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-12T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'grossetay@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542026425',
    '{"full_name": "איתי גרוס", "phone_number": "+972542026425"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-05-28T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ella123654gross@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543165314',
    '{"full_name": "אלה גרוס", "phone_number": "+972543165314"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-02-15T00:00:00Z', now(),
    false, false
  );

-- Batch 2/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'hilellbar@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972548008756',
    '{"full_name": "בר הילל", "phone_number": "+972548008756"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'jessicaabramov1@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972535207171',
    '{"full_name": "ג''סיקה אברמוב", "phone_number": "+972535207171"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Giloosh111@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972548081778',
    '{"full_name": "גילי צרבוניץ", "phone_number": "+972548081778"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-12-18T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'gilishahar115@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972523905352',
    '{"full_name": "גילי שחר", "phone_number": "+972523905352"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-04-01T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'galderi1999@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972545595578',
    '{"full_name": "גל דרי", "phone_number": "+972545595578"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-12-26T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '89galya89@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972526843989',
    '{"full_name": "גליה תשובה", "phone_number": "+972526843989"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-03-04T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972532440199@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972532440199',
    '{"full_name": "ג׳ני מובראק", "phone_number": "+972532440199"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-03-13T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972524637507@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972524637507',
    '{"full_name": "דור טאוב", "phone_number": "+972524637507"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2026-02-04T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972506696810@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972506696810',
    '{"full_name": "דניאל אלמור", "phone_number": "+972506696810"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-12-22T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'danielkeizmans@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972544255552',
    '{"full_name": "דניאל קייזמן", "phone_number": "+972544255552"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-09T00:00:00Z', now(),
    false, false
  );

-- Batch 3/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'shalomhila10@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546291154',
    '{"full_name": "הילה שלום", "phone_number": "+972546291154"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-08-28T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972505742572@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972505742572',
    '{"full_name": "ואלרי חמתי", "phone_number": "+972505742572"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'hava.salit@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972527216990',
    '{"full_name": "חווה גילן", "phone_number": "+972527216990"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-07-07T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'tanya.guernik49@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972507579471',
    '{"full_name": "טניה גרניק", "phone_number": "+972507579471"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-01T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'azur123456n@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972504365410',
    '{"full_name": "יהלי אזור", "phone_number": "+972504365410"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'juliet020y@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972502627632',
    '{"full_name": "יוליה צרפיס", "phone_number": "+972502627632"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-09T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'yonit.ayal@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972524473899',
    '{"full_name": "יונית אייל", "phone_number": "+972524473899"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-04-15T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'yaelrabbi69@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972523337639',
    '{"full_name": "יעל רבי", "phone_number": "+972523337639"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972547977685@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972547977685',
    '{"full_name": "לורין אביטן", "phone_number": "+972547977685"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972543450766@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543450766',
    '{"full_name": "ליאן סאסי", "phone_number": "+972543450766"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-07-23T00:00:00Z', now(),
    false, false
  );

-- Batch 4/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Libihadad110@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542061150',
    '{"full_name": "ליבי חדד", "phone_number": "+972542061150"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2026-01-13T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'lihiadam@icloud.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972527756815',
    '{"full_name": "ליהי אדם", "phone_number": "+972527756815"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-12T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972542797979@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542797979',
    '{"full_name": "לימור ראובן", "phone_number": "+972542797979"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-09-04T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ozlloly8899@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546488804',
    '{"full_name": "ליר עוז", "phone_number": "+972546488804"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maybx5@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542222312',
    '{"full_name": "מאי בודאי", "phone_number": "+972542222312"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-08-25T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maisireni@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972544334533',
    '{"full_name": "מאי סירני", "phone_number": "+972544334533"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maypery25@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546315315',
    '{"full_name": "מאי פרי", "phone_number": "+972546315315"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'm.l.maya@walla.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972524345118',
    '{"full_name": "מאיה לוי", "phone_number": "+972524345118"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'miarothman1@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972558826280',
    '{"full_name": "מיה רוטמן", "phone_number": "+972558826280"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-25T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maymayki2000@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972549492125',
    '{"full_name": "מייקי סמוכה", "phone_number": "+972549492125"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  );

-- Batch 5/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'kabalomika@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542262382',
    '{"full_name": "מיקה קבלו", "phone_number": "+972542262382"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-11-21T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'mikisanservice@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972547228789',
    '{"full_name": "מיקי סנדרוסי", "phone_number": "+972547228789"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972546666788@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546666788',
    '{"full_name": "מני מולדבסקי", "phone_number": "+972546666788"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-08-30T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'maria.petro3@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972533337473',
    '{"full_name": "מריה פטרו", "phone_number": "+972533337473"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2026-01-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'ayalnoya@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972527323331',
    '{"full_name": "נויה אייל", "phone_number": "+972527323331"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-02-25T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'noayaish1@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972542359905',
    '{"full_name": "נועה יעיש", "phone_number": "+972542359905"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972535219455@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972535219455',
    '{"full_name": "נועה סעדיה", "phone_number": "+972535219455"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2026-01-13T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Nofarefraim19@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972504443714',
    '{"full_name": "נופר אפרים", "phone_number": "+972504443714"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-03-02T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972524828539@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972524828539',
    '{"full_name": "ניצן בירמן", "phone_number": "+972524828539"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-04-14T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'noabarnea1@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972525459057',
    '{"full_name": "נעה ברנע", "phone_number": "+972525459057"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-12T00:00:00Z', now(),
    false, false
  );

-- Batch 6/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'noazahaviiii@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546680711',
    '{"full_name": "נעה זהבי", "phone_number": "+972546680711"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'n0549408258@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972549408258',
    '{"full_name": "נעמי ירימי", "phone_number": "+972549408258"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-08-01T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'saharmor1995@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543451515',
    '{"full_name": "סהר מור", "phone_number": "+972543451515"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2026-01-10T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'stavulner40@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972525272190',
    '{"full_name": "סתו אולנר", "phone_number": "+972525272190"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-08-23T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972503397799@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972503397799',
    '{"full_name": "עדי בנדר", "phone_number": "+972503397799"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-12T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'eden.peled@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972544331389',
    '{"full_name": "עדן פלד", "phone_number": "+972544331389"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-09T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Ofermiller2005@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972508102995',
    '{"full_name": "עופר מילר", "phone_number": "+972508102995"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-20T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'idan@gomiller.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972526102995',
    '{"full_name": "עידן מילר", "phone_number": "+972526102995"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-11-09T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'amitush219@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972508234565',
    '{"full_name": "עמית אברהמי", "phone_number": "+972508234565"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-03-06T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'pninit145@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972545944149',
    '{"full_name": "פנינית סויסא", "phone_number": "+972545944149"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-02-01T00:00:00Z', now(),
    false, false
  );

-- Batch 7/7
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'kanishchevekaterina@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972549419628',
    '{"full_name": "קטיה קנישצב", "phone_number": "+972549419628"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972543975294@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543975294',
    '{"full_name": "רון לולוי", "phone_number": "+972543975294"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-10-15T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Ronsason@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972546702636',
    '{"full_name": "רון ששון", "phone_number": "+972546702636"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-03-06T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'Shovalkatz26@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972526882255',
    '{"full_name": "שובל כץ", "phone_number": "+972526882255"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-01-14T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'shaybarzilay3796@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972545330042',
    '{"full_name": "שי ברזילי", "phone_number": "+972545330042"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-05-28T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'shir2246@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543971622',
    '{"full_name": "שיר ופניש", "phone_number": "+972543971622"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-04-27T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'shalomkakon97@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972503447741',
    '{"full_name": "שלום כאכון", "phone_number": "+972503447741"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-02-08T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '972543970287@reelrep.temp',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972543970287',
    '{"full_name": "שקד לולוי", "phone_number": "+972543970287"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-08-04T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sarabarda762@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972556822654',
    '{"full_name": "שרה ברדה", "phone_number": "+972556822654"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2024-09-19T00:00:00Z', now(),
    false, false
  ),(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'sharonit6@gmail.com',
    crypt('123456', gen_salt('bf')),
    now(),
    '+972544323700',
    '{"full_name": "שרון אבקסיס", "phone_number": "+972544323700"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '2025-02-04T00:00:00Z', now(),
    false, false
  );

