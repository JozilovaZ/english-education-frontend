"""
Lokal backendni test ma'lumotlari bilan to'ldiradi (faqat API orqali, Vite proxy ishlatiladi).

Talab: Django (127.0.0.1:8000) va Vite (5173) ishlab turishi, `niners` tenanti yaratilgan bo'lishi.
Ishlatish:  python dev/backend/seed.py
Qayta ishga tushirish xavfsiz: mavjud yozuvlar qayta yaratilmaydi.
"""

import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

# Windows `*.localhost` nomini o'zi hal qilmaydi (brauzer qiladi), shuning uchun
# 127.0.0.1 ga ulanamiz va tenant domenini Host header orqali beramiz.
BASE = "http://127.0.0.1:5173/api"
HOST = "niners.localhost:5173"
PASSWORD = "test12345"


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Host", HOST)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=60) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print(f"!! {method} {path} -> {e.code}: {e.read().decode()[:500]}")
        sys.exit(1)


def login(username, password):
    return call("POST", "/User/login/", body={"username": username, "password": password})["access"]


def items(data):
    # Pagination qo'shilsa ham ishlashi uchun
    return data["results"] if isinstance(data, dict) and "results" in data else data


def main():
    admin = login("admin", "admin12345")
    users = {u["username"]: u for u in items(call("GET", "/User/", admin))}

    def ensure_user(username, role, first, last, phone):
        if username not in users:
            users[username] = call("POST", "/User/", admin, {
                "username": username, "password": PASSWORD, "role": role,
                "first_name": first, "last_name": last, "phone": phone,
            })
            print(f"+ {role:8} {username}")
        return users[username]

    teacher = ensure_user("teacher1", "TEACHER", "Dilnoza", "Karimova", "+998901112001")
    # Oddiy markaz admini (SUPER_ADMIN emas) — ruxsatlar farqini tekshirish uchun
    ensure_user("manager1", "ADMIN", "Sardor", "Aliyev", "+998901111001")
    names = [("Ali", "Valiyev"), ("Madina", "Rahimova"), ("Jasur", "Toshmatov"),
             ("Nodira", "Saidova"), ("Bekzod", "Ergashev")]
    students = [
        ensure_user(f"student{i}", "STUDENT", f, l, f"+99890111300{i}")
        for i, (f, l) in enumerate(names, start=1)
    ]

    courses = items(call("GET", "/Educations/courses/", admin))
    course = next((c for c in courses if c["name"] == "General English"), None) or call(
        "POST", "/Educations/courses/", admin, {
            "name": "General English", "description": "Boshlang'ich daraja",
            "price": "450.00", "duration": "90 00:00:00", "lesson_quantity": 36,
        })

    groups = items(call("GET", "/Educations/groups/", admin))
    group = next((g for g in groups if g["name"] == "GE-1"), None)
    if not group:
        group = call("POST", "/Educations/groups/", admin, {
            "name": "GE-1", "course": course["id"], "teacher": teacher["id"],
            # Backend o'tgan sanani qabul qilmaydi
            "start_date": str(date.today()), "capacity": 15, "status": "active",
        })
        for s in students:
            call("POST", f"/Educations/groups/{group['id']}/add-student/", admin, {"student_id": s["id"]})
        for day in ("monday", "wednesday", "friday"):
            call("POST", "/Educations/schedules/", admin, {
                "group": group["id"], "day_of_week": day,
                "start_time": "14:00:00", "end_time": "15:30:00", "room": "101",
            })
        print(f"+ guruh GE-1, {len(students)} talaba, jadval")

    parents = items(call("GET", "/Parents/", admin))
    for i, s in enumerate(students[:3], start=1):
        if not any(p["user"] == s["id"] for p in parents):
            call("POST", "/Parents/", admin, {
                "user": s["id"], "full_name": f"{s['last_name']} (ota-ona)",
                "phone": f"+99893111400{i}",
            })
            print(f"+ ota-ona: {s['username']}")

    t = login("teacher1", PASSWORD)
    lessons = items(call("GET", "/Educations/lessons/", t))
    if not lessons:
        # 1-dars bugun erta tongda (o'tib bo'lgan — material qo'shish mumkin), qolganlari kelajakda
        plan = [
            (date.today(), "00:30:00", "01:30:00"),
            (date.today() + timedelta(days=2), "14:00:00", "15:30:00"),
            (date.today() + timedelta(days=4), "14:00:00", "15:30:00"),
        ]
        for n, (day, start, end) in enumerate(plan, start=1):
            lessons.append(call("POST", "/Educations/lessons/", t, {
                "group": group["id"], "title": f"Unit {n}", "lesson_number": n,
                "date": str(day), "start_time": start, "end_time": end,
            }))
        print("+ 3 ta dars")

    if len(items(call("GET", "/Attendance/", t))) < len(students):
        # bulk-mark mavjud yozuvlarni yangilaydi, shuning uchun qayta yuborish xavfsiz
        call("POST", "/Attendance/bulk-mark/", t, {
            "lesson": lessons[0]["id"],
            "attendances": [
                {"student": s["id"], "status": st}
                for s, st in zip(students, ["present", "present", "late", "absent", "excused"])
            ],
        })
        print("+ 1-dars davomati")

    homeworks = items(call("GET", "/Homework/", t))
    if not homeworks:
        call("POST", "/Homework/", t, {
            "lesson": lessons[0]["id"], "title": "Workbook 1-5 mashqlar",
            "description": "Unit 1 bo'yicha mashqlar", "max_score": 100,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        })
        print("+ uy vazifasi")

    exams = items(call("GET", "/Exams/", t))
    if not exams:
        exam = call("POST", "/Exams/", t, {
            "group": group["id"], "name": "Unit 1-3 test", "duration": "00:20:00",
            "passing_score": 2, "is_active": True,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        })
        qa = [
            ("She ___ a teacher.", ["is", "are", "am"], 0),
            ("They ___ from Tashkent.", ["is", "are", "be"], 1),
            ("I ___ English every day.", ["studies", "study", "studying"], 1),
        ]
        for text, options, correct in qa:
            q = call("POST", "/Exams/questions/", t, {"exam": exam["id"], "question": text, "points": 1})
            for i, opt in enumerate(options):
                call("POST", "/Exams/answers/", t, {
                    "question": q["id"], "answer": opt, "is_correct": i == correct,
                })
        print("+ imtihon (3 savol)")

    print("\nTayyor. Loginlar (parol: %s): teacher1, student1..student5" % PASSWORD)


if __name__ == "__main__":
    main()
