-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique not null,
  role text check (role in ('student','instructor','admin')) default 'student',
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- COURSES TABLE
create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text check (category in ('programming','graphic','it','financial')),
  description text,
  instructor_id uuid references users(id) on delete cascade,
  thumbnail_url text,
  price numeric(10,2) default 0,
  level text check (level in ('beginner','intermediate','advanced')),
  created_at timestamp with time zone default now()
);

-- LESSONS TABLE
create table if not exists lessons (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  video_url text,
  duration integer,
  order_index integer,
  created_at timestamp with time zone default now()
);

-- ENROLLMENTS TABLE
create table if not exists enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  enrolled_at timestamp with time zone default now()
);

-- REVIEWS TABLE
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table users enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;
alter table enrollments enable row level security;
alter table reviews enable row level security;

-- Users policies
create policy "Users can view their own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on users
  for update using (auth.uid() = id);

create policy "Public can view user profiles" on users
  for select using (true);

-- Courses policies
create policy "Anyone can view courses" on courses
  for select using (true);

create policy "Instructors can create courses" on courses
  for insert with check (
    exists (select 1 from users where id = auth.uid() and role in ('instructor', 'admin'))
  );

create policy "Instructors can update their own courses" on courses
  for update using (instructor_id = auth.uid());

create policy "Admins can manage all courses" on courses
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Lessons policies
create policy "Anyone can view lessons" on lessons
  for select using (true);

create policy "Instructors can manage lessons of their courses" on lessons
  for all using (
    exists (
      select 1 from courses 
      where courses.id = lessons.course_id 
      and courses.instructor_id = auth.uid()
    )
  );

-- Enrollments policies
create policy "Users can view their own enrollments" on enrollments
  for select using (user_id = auth.uid());

create policy "Users can enroll themselves" on enrollments
  for insert with check (user_id = auth.uid());

create policy "Users can update their own enrollment progress" on enrollments
  for update using (user_id = auth.uid());

-- Reviews policies
create policy "Anyone can view reviews" on reviews
  for select using (true);

create policy "Enrolled users can create reviews" on reviews
  for insert with check (
    exists (
      select 1 from enrollments 
      where enrollments.user_id = auth.uid() 
      and enrollments.course_id = reviews.course_id
    )
  );

create policy "Users can update their own reviews" on reviews
  for update using (user_id = auth.uid());

create policy "Users can delete their own reviews" on reviews
  for delete using (user_id = auth.uid());

-- Create indexes for better performance
create index if not exists idx_courses_category on courses(category);
create index if not exists idx_courses_instructor on courses(instructor_id);
create index if not exists idx_lessons_course on lessons(course_id);
create index if not exists idx_enrollments_user on enrollments(user_id);
create index if not exists idx_enrollments_course on enrollments(course_id);
create index if not exists idx_reviews_course on reviews(course_id);
create index if not exists idx_reviews_user on reviews(user_id);