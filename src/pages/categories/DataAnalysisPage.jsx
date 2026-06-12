import React from 'react';
import CategoryPage from './CategoryPage';

const DataAnalysisPage = () => {
  return (
    <CategoryPage
      categoryKey="data_analysis"
      title="Data Analysis"
      subtitle="Turn Data into Decisions"
      description="Master statistics, data visualization, and analytical skills. Transform raw data into actionable business insights."
      backgroundVideo="/assets/eduvideo.mp4"
      backgroundImage="/assets/data.jpg"
      icon="📊"
      color="#45B7D1"
      features={['Statistical Analysis', 'Data Visualization', 'Python & R', 'Business Intelligence', 'SQL', 'Excel', 'Tableau', 'Power BI']}
      courses={[
        { id: 401, title: 'Data Analysis Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/data.jpg' },
        { id: 402, title: 'Python for Data Analysis', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/data.jpg' },
        { id: 403, title: 'SQL & Database Analysis', level: 'Intermediate', duration: '5 weeks', price: '$69', image: '/assets/data.jpg' },
        { id: 404, title: 'Data Visualization with Tableau', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/data.jpg' },
        { id: 405, title: 'Business Intelligence', level: 'Advanced', duration: '8 weeks', price: '$99', image: '/assets/data.jpg' },
        { id: 406, title: 'Data Science Bootcamp', level: 'All Levels', duration: '16 weeks', price: '$199', image: '/assets/data.jpg' },
      ]}
    />
  );
};

export default DataAnalysisPage;