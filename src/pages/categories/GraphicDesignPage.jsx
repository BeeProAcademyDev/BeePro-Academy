import React from 'react';
import CategoryPage from './CategoryPage';

const GraphicDesignPage = () => {
  return (
    <CategoryPage
      categoryKey="graphic_design"
      title="Graphic Design"
      subtitle="Unleash Your Creativity"
      description="Transform ideas into stunning visuals. Master creative design, UI/UX principles, and visual arts to create impactful digital experiences."
      backgroundVideo="/assets/eduvideo.mp4"
      backgroundImage="/assets/grapich1.jpg"
      icon="🎨"
      color="#FF6B6B"
      features={['UI/UX Design', 'Brand Identity', 'Digital Illustration', 'Motion Graphics', 'Adobe Suite', 'Figma', 'Logo Design', 'Web Design']}
      courses={[
        { id: 201, title: 'Design Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/grapich1.jpg' },
        { id: 202, title: 'UI/UX Masterclass', level: 'Intermediate', duration: '8 weeks', price: '$99', image: '/assets/grapich1.jpg' },
        { id: 203, title: 'Adobe Photoshop Pro', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/grapich1.jpg' },
        { id: 204, title: 'Brand Identity Design', level: 'Advanced', duration: '6 weeks', price: '$89', image: '/assets/grapich1.jpg' },
        { id: 205, title: 'Motion Graphics', level: 'Advanced', duration: '10 weeks', price: '$129', image: '/assets/grapich1.jpg' },
        { id: 206, title: 'Complete Design Bootcamp', level: 'All Levels', duration: '16 weeks', price: '$199', image: '/assets/grapich1.jpg' },
      ]}
    />
  );
};

export default GraphicDesignPage;