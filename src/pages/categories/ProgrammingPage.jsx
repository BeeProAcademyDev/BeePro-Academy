import React from 'react';
import CategoryPage from './CategoryPage';

const ProgrammingPage = () => {
  return (
    <CategoryPage
      categoryKey="programming"
      title="Programming"
      subtitle="Master the Art of Code"
      description="Dive into software development, web programming, and coding languages. From Python to JavaScript, build the skills that power the digital world."
      backgroundVideo="/assets/eduvideo.mp4"
      backgroundImage="/assets/code4.jpg"
      icon="💻"
      color="#00D9FF"
      hideHeroContent={true}
      features={['Web Development', 'Mobile Apps', 'Software Engineering', 'Full-Stack Development', 'Python', 'JavaScript', 'React', 'Node.js']}
      courses={[
        { id: 101, title: 'Python Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/code4.jpg' },
        { id: 102, title: 'JavaScript Mastery', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/code4.jpg' },
        { id: 103, title: 'React Development', level: 'Intermediate', duration: '8 weeks', price: '$99', image: '/assets/code4.jpg' },
        { id: 104, title: 'Node.js Backend', level: 'Advanced', duration: '6 weeks', price: '$89', image: '/assets/code4.jpg' },
        { id: 105, title: 'Full-Stack Bootcamp', level: 'All Levels', duration: '16 weeks', price: '$199', image: '/assets/code4.jpg' },
        { id: 106, title: 'Mobile App Development', level: 'Intermediate', duration: '10 weeks', price: '$129', image: '/assets/code4.jpg' },
      ]}
    />
  );
};

export default ProgrammingPage;