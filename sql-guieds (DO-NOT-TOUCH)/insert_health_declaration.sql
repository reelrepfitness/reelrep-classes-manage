-- Insert or Update the Health Declaration form
INSERT INTO public.app_forms (title, description, form_type, version, is_active, content)
VALUES (
  'הצהרת בריאות - Reel Rep Fitness',
  'שאלון הצהרת בריאות שנתי',
  'health_declaration', 
  1,
  true,
  '[
    {"id": 1, "text": "האם הרופא שלך אמר לך שאתה סובל ממחלת לב?", "type": "yes_no", "risk_answer": true},
    {"id": 2, "text": "האם אתה חש כאבים בחזה בזמן מנוחה?", "type": "yes_no", "risk_answer": true},
    {"id": 3, "text": "האם אתה חש כאבים בחזה במהלך פעילויות שיגרה ביום-יום?", "type": "yes_no", "risk_answer": true},
    {"id": 4, "text": "האם אתה חש כאבים בחזה בזמן שאתה מבצע פעילות גופנית?", "type": "yes_no", "risk_answer": true},
    {"id": 5, "text": "האם במהלך השנה החולפת איבדת שיווי משקל עקב סחרחורת? (סמן לא אם נבע מנשימת יתר)", "type": "yes_no", "risk_answer": true},
    {"id": 6, "text": "האם במהלך השנה החולפת איבדת את הכרתך?", "type": "yes_no", "risk_answer": true},
    {"id": 7, "text": "האם רופא אבחן שאתה סובל ממחלת האסתמה ונזקקת לטיפול תרופתי ב-3 חודשים אחרונים?", "type": "yes_no", "risk_answer": true},
    {"id": 8, "text": "האם רופא אבחן שאתה סובל ממחלת האסתמה וסבלת מקוצר נשימה/צפצופים ב-3 חודשים אחרונים?", "type": "yes_no", "risk_answer": true},
    {"id": 9, "text": "האם אחד מבני משפחתך מדרגת קרבה ראשונה נפטר ממחלת לב?", "type": "yes_no", "risk_answer": true},
    {"id": 10, "text": "האם אחד מבני משפחתך מדרגת קרבה ראשונה נפטר ממוות פתאומי בגיל מוקדם?", "type": "yes_no", "risk_answer": true},
    {"id": 11, "text": "האם הרופא שלך אמר לך ב-5 השנים האחרונות לבצע פעילות גופנית רק תחת השגחה רפואית?", "type": "yes_no", "risk_answer": true},
    {"id": 12, "text": "האם הינך סובל ממחלה קבועה (כרונית) שעשויה למנוע או להגביל אותך בביצוע פעילות גופנית?", "type": "yes_no", "risk_answer": true},
    {"id": 13, "text": "לנשים בהריון: האם ההריון הזה או כל הריון קודם הוגדר הריון בסיכון?", "type": "yes_no", "risk_answer": true},
    {"id": 14, "text": "הנחיות: אם סימנת כן באחת מהשאלות, יש להמציא אישור רפואי.", "type": "instruction"},
    {"id": 15, "text": "אני מצהיר כי קראתי והבנתי את השאלון ומסרתי פרטים נכונים.", "type": "declaration"}
  ]'
);

-- Delete any existing duplicates if necessary (Optional, be careful)
-- DELETE FROM public.app_forms WHERE form_type = 'health_declaration' AND id NOT IN (SELECT max(id) FROM public.app_forms WHERE form_type = 'health_declaration');
