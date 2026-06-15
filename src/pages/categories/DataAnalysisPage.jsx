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
        { id: 'data-analysis-demo', title: 'Data Analysis Fundamentals', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/data.jpg' },
      ]}
    />
  );
};

export default DataAnalysisPage;
