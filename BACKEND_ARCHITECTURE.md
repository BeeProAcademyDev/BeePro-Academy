# 🎓 BePro Academy - Production-Ready Backend Architecture

## 📋 **Overview**

This document outlines the complete backend architecture for BePro Academy educational platform built on **Supabase** with **PostgreSQL**, providing enterprise-grade features for online education.

---

## 🏗️ **Architecture Components**

### **Core Technology Stack**
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage with RLS
- **Real-time**: Supabase Realtime subscriptions
- **Security**: Row Level Security (RLS) on all tables

---

## 🔐 **Authentication & User Roles**

### **Supported Roles**
| Role | Permissions | Description |
|------|-------------|-------------|
| **Admin** | Full access to all resources | System administrators |
| **Instructor** | Manage own courses, students, content | Course creators and teachers |
| **Student** | Access enrolled courses, take quizzes | Course learners |

### **Authentication Flow**
```sql
-- User table with role-based access
CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('student','instructor','admin')) DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📚 **Course Management System**

### **Hierarchical Structure**
```
Course
├── Course Sections (Modules)
│   ├── Lesson 1
│   │   ├── Video Content
│   │   ├── Attachments (PDFs, Documents)
│   │   └── Quiz (Optional)
│   └── Lesson 2
└── Course Metadata (Price, Level, Category)
```

### **Core Tables**

#### **Categories**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

#### **Courses**
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('programming','graphic','it','financial')),
  description TEXT,
  instructor_id UUID REFERENCES users(id),
  thumbnail_url TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  level TEXT CHECK (level IN ('beginner','intermediate','advanced'))
);
```

#### **Course Sections**
```sql
CREATE TABLE course_sections (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE
);
```

#### **Lessons**
```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES course_sections(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration INTEGER,
  order_index INTEGER,
  is_free BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE
);
```

---

## 🧠 **Quiz & Examination System**

### **Quiz Architecture**
```
Quiz
├── Quiz Questions
│   ├── Multiple Choice Options
│   ├── True/False Options
│   └── Short Answer
└── Quiz Attempts
    └── Attempt Answers
```

### **Key Features**
- **Multiple Question Types**: Multiple choice, True/False, Short answer
- **Automatic Grading**: Instant feedback and scoring
- **Attempt Tracking**: Multiple attempts with limits
- **Time Management**: Quiz duration limits
- **Randomization**: Question and option randomization

### **Quiz Tables**
```sql
-- Quizzes per lesson/course
CREATE TABLE quizzes (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR(255) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  passing_score INTEGER DEFAULT 70,
  max_attempts INTEGER DEFAULT 3,
  is_published BOOLEAN DEFAULT FALSE
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id),
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'multiple_choice',
  explanation TEXT,
  points INTEGER DEFAULT 1
);

-- Answer options
CREATE TABLE quiz_answer_options (
  id UUID PRIMARY KEY,
  question_id UUID REFERENCES quiz_questions(id),
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE
);

-- Student attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id),
  user_id UUID REFERENCES users(id),
  score DECIMAL(5,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  is_passed BOOLEAN DEFAULT FALSE,
  attempt_number INTEGER DEFAULT 1
);
```

---

## 📈 **Progress Tracking System**

### **Multi-Level Tracking**
1. **Course-Level Progress**: Overall completion percentage
2. **Lesson-Level Progress**: Individual lesson completion
3. **Watch Time Tracking**: Video consumption analytics
4. **Quiz Performance**: Assessment scores and attempts

### **Progress Tables**
```sql
-- Enrollment tracking
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  progress INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detailed lesson progress
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),
  course_id UUID REFERENCES courses(id),
  is_completed BOOLEAN DEFAULT FALSE,
  watch_time_seconds INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🏆 **Certificate System**

### **Automatic Certificate Generation**
- **Trigger-Based**: Auto-issued when course completion reaches 100%
- **Unique Certificate Numbers**: Format: `CERT-YYYY-XXXXXX`
- **Verification System**: Public verification via unique codes
- **Revocation Support**: Admin ability to revoke certificates

### **Certificate Table**
```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at DATE,
  certificate_url TEXT,
  verification_code VARCHAR(20) UNIQUE,
  is_revoked BOOLEAN DEFAULT FALSE
);
```

---

## 💳 **Payment & Pricing System**

### **Flexible Pricing Models**
- **Free Courses**: No payment required
- **One-time Purchase**: Single payment for lifetime access
- **Subscription**: Recurring payment model
- **Installments**: Multiple payment plans

### **Payment Tables**
```sql
CREATE TABLE course_pricing (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  pricing_type VARCHAR(20) DEFAULT 'one_time',
  base_price DECIMAL(10,2) DEFAULT 0,
  discounted_price DECIMAL(10,2),
  discount_percentage INTEGER,
  currency VARCHAR(3) DEFAULT 'USD'
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  transaction_id VARCHAR(255)
);
```

---

## 🎥 **Live Session Management**

### **Meeting Features**
- **Google Meet Integration**: Live video sessions
- **Attendance Tracking**: Join/leave time logging
- **Recording Support**: Session recording URLs
- **Scheduling**: Advanced scheduling with time zones

### **Meeting Tables**
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  meet_link VARCHAR(500) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'scheduled'
);

CREATE TABLE meeting_attendees (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  attendance_status VARCHAR(20) DEFAULT 'registered'
);
```

---

## 📁 **File Management & Storage**

### **Supabase Storage Buckets**

| Bucket | Type | Purpose | Size Limit |
|--------|------|---------|------------|
| `course-thumbnails` | Public | Course images, banners | 5MB |
| `user-avatars` | Public | Profile pictures | 2MB |
| `lesson-videos` | Private | Course video content | 1GB |
| `lesson-attachments` | Private | PDFs, documents | 50MB |
| `certificates` | Private | Generated certificates | 10MB |
| `course-materials` | Private | Additional resources | 100MB |

### **Storage Security**
- **Row Level Security**: File access based on enrollment
- **Signed URLs**: Temporary access for video streaming
- **Folder Organization**: Structured by course/lesson/user IDs

---

## 🔒 **Row Level Security (RLS) Implementation**

### **Core Security Principles**
1. **Students**: Access only enrolled course content
2. **Instructors**: Manage only their own courses
3. **Admins**: Full access to all resources
4. **Public**: Limited access to course catalogs

### **Example RLS Policies**

#### **Course Access Policy**
```sql
-- Students can view courses they're enrolled in
CREATE POLICY "Students access enrolled courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.course_id = courses.id
    AND enrollments.user_id = auth.uid()
  )
);

-- Instructors can manage their own courses
CREATE POLICY "Instructors manage own courses"
ON courses FOR ALL
USING (instructor_id = auth.uid());
```

#### **Lesson Progress Policy**
```sql
-- Students can only manage their own progress
CREATE POLICY "Students manage own progress"
ON lesson_progress FOR ALL
USING (user_id = auth.uid());
```

#### **Quiz Attempt Policy**
```sql
-- Students can only view/create their own attempts
CREATE POLICY "Students manage own quiz attempts"
ON quiz_attempts FOR ALL
USING (user_id = auth.uid());
```

---

## ⚡ **Performance Optimization**

### **Database Indexes**
```sql
-- Course discovery
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);

-- User activity
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);

-- Content hierarchy
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_course_sections_course ON course_sections(course_id);
```

### **Database Views**
```sql
-- Course overview with statistics
CREATE VIEW course_overview AS
SELECT 
  c.id, c.title, c.description, c.price,
  COUNT(DISTINCT e.id) as total_enrollments,
  COUNT(DISTINCT l.id) as total_lessons,
  AVG(r.rating) as average_rating
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
LEFT JOIN lessons l ON l.course_id = c.id
LEFT JOIN reviews r ON r.course_id = c.id
GROUP BY c.id;
```

---

## 🔄 **Business Logic Functions**

### **Automatic Progress Calculation**
```sql
-- Calculate course completion percentage
CREATE FUNCTION calculate_course_completion(user_id UUID, course_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_lessons INTEGER;
    completed_lessons INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_lessons
    FROM lessons WHERE course_id = $2 AND is_published = TRUE;
    
    SELECT COUNT(*) INTO completed_lessons
    FROM lesson_progress 
    WHERE user_id = $1 AND course_id = $2 AND is_completed = TRUE;
    
    RETURN ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;
```

### **Certificate Auto-Generation**
```sql
-- Trigger to auto-issue certificates
CREATE FUNCTION check_and_issue_certificate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.progress >= 100 THEN
        INSERT INTO certificates (user_id, course_id, certificate_number)
        VALUES (NEW.user_id, NEW.course_id, generate_certificate_number());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **Analytics & Reporting**

### **User Activity Tracking**
```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Course Statistics**
```sql
CREATE TABLE course_statistics (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  total_enrollments INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0
);
```

---

## 🔔 **Notification System**

### **Multi-Channel Notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500)
);
```

### **Notification Types**
- `general` - System announcements
- `meeting` - Live session reminders
- `enrollment` - Course enrollment confirmations
- `course_update` - New content notifications
- `reminder` - Assignment/quiz deadlines
- `announcement` - Instructor announcements

---

## 🚀 **Deployment & Migration Guide**

### **Migration Files**
1. **`schema.sql`** - Core tables and basic RLS
2. **`002_meetings_notifications.sql`** - Live sessions and notifications
3. **`003_enhanced_education_platform.sql`** - Complete enhanced schema
4. **`storage-buckets-config.sql`** - Storage configuration

### **Deployment Steps**
1. **Create Supabase Project**
2. **Run Migrations in Order**:
   ```sql
   -- Run in Supabase SQL Editor
   \i schema.sql
   \i migrations/002_meetings_notifications.sql
   \i migrations/003_enhanced_education_platform.sql
   \i storage-buckets-config.sql
   ```
3. **Configure Storage Buckets**
4. **Set up Authentication Providers**
5. **Configure RLS Policies**

---

## 🏆 **Key Features Delivered**

### ✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Student, Instructor, Admin)
- Row Level Security on all tables

### ✅ **Course Management**
- Hierarchical course structure (Course → Sections → Lessons)
- Rich media support (videos, attachments, images)
- Pricing and enrollment system

### ✅ **Assessment System**
- Multi-type quizzes (MCQ, T/F, Short Answer)
- Automatic grading and feedback
- Attempt tracking and limits

### ✅ **Progress Tracking**
- Granular lesson progress
- Course completion tracking
- Watch time analytics

### ✅ **Live Learning**
- Google Meet integration
- Attendance tracking
- Session recording

### ✅ **Certification**
- Automatic certificate generation
- Unique verification codes
- Revocation support

### ✅ **File Management**
- Secure file storage with RLS
- Multiple file type support
- Organized folder structure

### ✅ **Analytics**
- User activity logging
- Course performance metrics
- Revenue tracking

### ✅ **Scalability**
- Optimized database indexes
- Efficient query patterns
- Horizontal scaling ready

---

## 📱 **Frontend Integration Examples**

### **Course Enrollment**
```javascript
// Enroll student in course
const { data, error } = await supabase
  .from('enrollments')
  .insert({
    user_id: user.id,
    course_id: courseId
  });
```

### **Progress Tracking**
```javascript
// Update lesson progress
const { data, error } = await supabase
  .from('lesson_progress')
  .upsert({
    user_id: user.id,
    lesson_id: lessonId,
    course_id: courseId,
    is_completed: true,
    completion_percentage: 100
  });
```

### **Quiz Submission**
```javascript
// Submit quiz attempt
const { data, error } = await supabase
  .from('quiz_attempts')
  .insert({
    quiz_id: quizId,
    user_id: user.id,
    score: totalScore,
    percentage: (totalScore / maxScore) * 100,
    is_passed: percentage >= passingScore
  });
```

---

## 🔧 **Maintenance & Monitoring**

### **Database Maintenance**
- Regular VACUUM and ANALYZE operations
- Index usage monitoring
- Query performance analysis

### **Security Auditing**
- RLS policy effectiveness
- Authentication logs review
- File access auditing

### **Backup Strategy**
- Automated daily backups
- Point-in-time recovery
- Cross-region backup storage

---

**🎯 This architecture provides a robust, scalable foundation for a modern educational platform with enterprise-grade features and security.**