#!/usr/bin/env python3
"""
Read the actual BoostUp CSV and generate SQL for importing into Supabase auth.users + profiles.
"""
import csv
import json

CSV_PATH = "/Users/ivanzaits/Downloads/גיליון ללא שם - sheet1.csv"
ADMIN_PHONE = "+972528406273"
ADMIN_DB_ID = "c30ad7ce-7870-47cf-9dab-fe0b45f6404d"

GENDER_MAP = {"גבר": "male", "אישה": "female", "אחר": "other"}
STATUS_MAP = {"פעיל": "active", "ארכיון": "archived"}

# ============================================================
# 1. Read CSV
# ============================================================
with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_rows = list(reader)

print(f"CSV loaded: {len(all_rows)} rows")

# ============================================================
# 2. Process rows
# ============================================================
to_import = []
skipped_admin = None
no_email_count = 0

for row in all_rows:
    name = row["לקוח"].strip()
    phone = row["טלפון"].strip()
    email = row.get("אימייל", "").strip()
    join_date = row.get("תאריך הצטרפות", "").strip()
    status_heb = row.get("סטטוס", "").strip()
    gender_heb = row.get("מגדר", "").strip()

    status = STATUS_MAP.get(status_heb, "active")
    gender = GENDER_MAP.get(gender_heb, "other")

    # Skip admin
    if phone == ADMIN_PHONE:
        skipped_admin = {"name": name, "phone": phone, "email": email, "gender": gender}
        print(f"  SKIP (admin): {name} | {phone}")
        continue

    # Handle missing email
    if not email:
        digits = phone.replace("+", "")
        email = f"{digits}@reelrep.temp"
        no_email_count += 1

    to_import.append({
        "name": name,
        "phone": phone,
        "email": email,
        "join_date": join_date if join_date else None,
        "status": status,
        "gender": gender,
    })

# ============================================================
# 3. Validation
# ============================================================
print(f"\n=== DRY RUN SUMMARY ===")
print(f"Total to import: {len(to_import)}")
print(f"Active: {sum(1 for r in to_import if r['status'] == 'active')}")
print(f"Archived: {sum(1 for r in to_import if r['status'] == 'archived')}")
print(f"With real email: {len(to_import) - no_email_count}")
print(f"With temp email (@reelrep.temp): {no_email_count}")

# Check for duplicate phones
phones_seen = set()
dup_phones = []
for r in to_import:
    if r["phone"] in phones_seen:
        dup_phones.append(r["phone"])
    phones_seen.add(r["phone"])

# Check for duplicate emails
emails_seen = set()
dup_emails = []
for r in to_import:
    if r["email"] in emails_seen:
        dup_emails.append(r["email"])
    emails_seen.add(r["email"])

if dup_phones:
    print(f"\n⚠️  DUPLICATE PHONES: {dup_phones}")
else:
    print(f"No duplicate phones ✓")

if dup_emails:
    print(f"⚠️  DUPLICATE EMAILS: {dup_emails}")
else:
    print(f"No duplicate emails ✓")

# ============================================================
# 4. Print all rows
# ============================================================
print(f"\n=== ALL ROWS TO IMPORT ===")
for i, r in enumerate(to_import):
    flags = []
    if "@reelrep.temp" in r["email"]:
        flags.append("TEMP")
    if r["status"] == "archived":
        flags.append("ARCH")
    flag_str = f" [{','.join(flags)}]" if flags else ""
    print(f"{i+1:3d}. {r['name']:25s} | {r['phone']} | {r['email']:40s} | {r['gender']:6s} | {r['join_date'] or 'NOW':10s}{flag_str}")

# ============================================================
# 5. Generate SQL
# ============================================================
def sql_escape(s):
    return s.replace("'", "''")

# -- AUTH USERS INSERT (batched) --
auth_sql_parts = []
for r in to_import:
    name_esc = sql_escape(r["name"])
    email_esc = sql_escape(r["email"])
    phone_esc = sql_escape(r["phone"])
    join_ts = f"'{r['join_date']}T00:00:00Z'" if r["join_date"] else "now()"

    metadata = json.dumps({"full_name": r["name"], "phone_number": r["phone"]}, ensure_ascii=False)
    metadata_esc = sql_escape(metadata)

    auth_sql_parts.append(f"""(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    '{email_esc}',
    crypt('123456', gen_salt('bf')),
    now(),
    '{phone_esc}',
    '{metadata_esc}'::jsonb,
    '{{"provider":"email","providers":["email"]}}'::jsonb,
    {join_ts}, now(),
    false, false
  )""")

batch_size = 10
auth_batches = []
for i in range(0, len(auth_sql_parts), batch_size):
    batch = auth_sql_parts[i:i+batch_size]
    sql = f"""INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, phone, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
  {','.join(batch)};"""
    auth_batches.append(sql)

# -- PROFILE UPDATES (batched) --
update_sql_parts = []
for r in to_import:
    name_esc = sql_escape(r["name"])
    email_esc = sql_escape(r["email"])
    phone_esc = sql_escape(r["phone"])

    update_sql_parts.append(f"""  UPDATE profiles SET
    full_name = '{name_esc}',
    phone_number = '{phone_esc}',
    gender = '{r["gender"]}',
    role = 'user',
    is_admin = false,
    is_coach = false,
    status = '{r["status"]}',
    force_password_change = true
  WHERE email = '{email_esc}';""")

update_batches = []
for i in range(0, len(update_sql_parts), batch_size):
    batch = update_sql_parts[i:i+batch_size]
    update_batches.append("\n".join(batch))

# -- Write SQL files --
with open("/Users/ivanzaits/Desktop/reel-rep-training-app-main/scripts/import-auth-users.sql", "w", encoding="utf-8") as f:
    for i, batch in enumerate(auth_batches):
        f.write(f"-- Batch {i+1}/{len(auth_batches)}\n")
        f.write(batch)
        f.write("\n\n")

with open("/Users/ivanzaits/Desktop/reel-rep-training-app-main/scripts/import-update-profiles.sql", "w", encoding="utf-8") as f:
    for i, batch in enumerate(update_batches):
        f.write(f"-- Batch {i+1}/{len(update_batches)}\n")
        f.write(batch)
        f.write("\n\n")

# -- Write credentials CSV --
with open("/Users/ivanzaits/Desktop/client-credentials.csv", "w", encoding="utf-8-sig") as f:
    f.write("שם,טלפון,אימייל להתחברות\n")
    for r in to_import:
        f.write(f"{r['name']},{r['phone']},{r['email']}\n")

# -- Also write individual batch SQL as separate files for MCP execution --
for i, batch in enumerate(auth_batches):
    with open(f"/Users/ivanzaits/Desktop/reel-rep-training-app-main/scripts/auth-batch-{i+1}.sql", "w", encoding="utf-8") as f:
        f.write(batch)

for i, batch in enumerate(update_batches):
    with open(f"/Users/ivanzaits/Desktop/reel-rep-training-app-main/scripts/profile-batch-{i+1}.sql", "w", encoding="utf-8") as f:
        f.write(batch)

print(f"\n=== FILES GENERATED ===")
print(f"Auth SQL batches: {len(auth_batches)}")
print(f"Profile update batches: {len(update_batches)}")
print(f"Credentials: /Users/ivanzaits/Desktop/client-credentials.csv")
