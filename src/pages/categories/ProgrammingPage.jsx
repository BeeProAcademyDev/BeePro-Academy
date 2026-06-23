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
    />
  );
};

export default ProgrammingPage;
