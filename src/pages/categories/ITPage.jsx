import React from 'react';
import CategoryPage from './CategoryPage';

const ITPage = () => {
  return (
    <CategoryPage
      categoryKey="it"
      title="Information Technology"
      subtitle="Build the Future Infrastructure"
      description="Explore networking, cybersecurity, and cloud technologies. Become the backbone of modern digital enterprises."
      backgroundVideo="/assets/eduvideo.mp4"
      backgroundImage="/assets/it2.jpg"
      icon="🖥️"
      color="#4ECDC4"
      features={['Cloud Computing', 'Cybersecurity', 'Network Administration', 'System Management', 'AWS', 'Azure', 'Linux', 'DevOps']}
      courses={[
        { id: 'it-demo', title: 'IT Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/it2.jpg' },
      ]}
    />
  );
};

export default ITPage;
