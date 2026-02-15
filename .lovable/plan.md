

# University ERP & Student Information System (SIS)

A comprehensive, modern enterprise-grade web application for managing all aspects of university operations — from student enrollment to academics, finance, and attendance.

---

## 🔐 Authentication & Role-Based Access

- **Login/signup** with email-based authentication via Lovable Cloud (Supabase)
- **Three user roles**: Admin, Faculty, and Student — each with their own dashboard and permissions
- Role-based navigation: users only see what's relevant to them
- Secure role management stored in a dedicated `user_roles` table

---

## 📊 Dashboards (Role-Specific)

### Admin Dashboard
- Overview cards: total students, faculty, courses, revenue
- Quick stats charts (enrollment trends, fee collection status)
- Recent activity feed and notifications

### Faculty Dashboard
- My courses, upcoming classes, pending grading tasks
- Student count per course, attendance summaries

### Student Dashboard
- Current semester schedule, GPA summary
- Fee payment status, upcoming deadlines
- Quick links to enrollment, grades, and transcript

---

## 👨‍🎓 Module 1: Student Records & Enrollment

- **Student profiles**: personal info, contact details, program, year, status (active/graduated/suspended)
- **Admission management**: add new students, assign programs and departments
- **Course registration**: students browse available courses, enroll per semester with conflict detection
- **Search & filter** students by name, ID, program, year, status
- Admin can view/edit any student; students can view their own profile

---

## 📚 Module 2: Academics & Grading

- **Department & Program management**: create departments, programs, and curricula
- **Course catalog**: course code, title, credits, prerequisites, assigned faculty
- **Class scheduling**: assign courses to time slots, rooms, and semesters
- **Grade management**: faculty enter grades per student per course; supports letter grades and GPA calculation
- **Transcript view**: students see semester-by-semester grades and cumulative GPA
- Admin can generate reports on academic performance

---

## 💰 Module 3: Finance & Fees

- **Fee structure setup**: define tuition and other fees per program/semester
- **Student billing**: auto-generate fee invoices per student per semester
- **Payment tracking**: record payments, show outstanding balances
- **Payment history**: students and admins can view payment records
- Dashboard widget showing collection rates and overdue accounts

---

## 📋 Module 4: Attendance & Timetable

- **Timetable management**: admin/faculty create weekly class schedules per course
- **Timetable views**: students see their personal weekly schedule; faculty see their teaching schedule
- **Attendance recording**: faculty mark attendance per class session (present/absent/late)
- **Attendance reports**: per student, per course, with percentage calculations
- Alerts for students below minimum attendance threshold

---

## 🧭 Navigation & Layout

- **Sidebar navigation** with collapsible menu, organized by module
- Sidebar sections adapt based on user role
- **Top header** with user avatar, notifications bell, and logout
- Responsive design for desktop-first usage with basic mobile support
- Modern enterprise aesthetic: clean whites, subtle shadows, professional typography, data-rich tables with sorting/filtering

---

## 🗄️ Database (Lovable Cloud / Supabase)

Key tables include:
- `profiles` — user details linked to auth
- `user_roles` — role assignments (admin/faculty/student)
- `departments`, `programs` — organizational structure
- `courses`, `course_schedules` — course catalog and timetable
- `enrollments` — student-course registrations per semester
- `grades` — grade records per enrollment
- `fee_structures`, `invoices`, `payments` — financial records
- `attendance_records` — per-session attendance
- All tables secured with Row-Level Security policies

---

## 🚀 Implementation Approach

Since this is comprehensive, we'll build iteratively in this order:
1. **Auth + Roles + Layout** — login, role-based dashboards, sidebar navigation
2. **Student Records & Enrollment** — profiles, programs, course registration
3. **Academics & Grading** — courses, scheduling, grade entry, transcripts
4. **Finance & Fees** — billing, payments, tracking
5. **Attendance & Timetable** — schedules, attendance marking, reports

Each phase will be fully functional before moving to the next.

