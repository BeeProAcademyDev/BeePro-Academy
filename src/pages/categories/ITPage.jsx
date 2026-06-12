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
        { id: 301, title: 'IT Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/it2.jpg' },
        { id: 302, title: 'Network Administration', level: 'Intermediate', duration: '8 weeks', price: '$99', image: '/assets/it2.jpg' },
        { id: 303, title: 'Cybersecurity Essentials', level: 'Intermediate', duration: '6 weeks', price: '$89', image: '/assets/it2.jpg' },
        { id: 304, title: 'AWS Cloud Practitioner', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/it2.jpg' },
        { id: 305, title: 'Linux System Administration', level: 'Advanced', duration: '8 weeks', price: '$99', image: '/assets/it2.jpg' },
        { id: 306, title: 'DevOps Engineering', level: 'Advanced', duration: '12 weeks', price: '$149', image: '/assets/it2.jpg' },
      ]}
    />
  );
};

export default ITPage;