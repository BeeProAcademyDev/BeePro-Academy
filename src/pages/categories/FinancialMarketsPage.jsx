import React from 'react';
import CategoryPage from './CategoryPage';

const FinancialMarketsPage = () => {
  return (
    <CategoryPage
      categoryKey="financial_markets"
      title="Financial Markets Analysis"
      subtitle="Navigate the Markets"
      description="Understand market data, trading strategies, and investment insights. Build expertise in financial analysis and risk management."
      backgroundImage="/assets/anlysis.jpg"
      backgroundVideo="/assets/eduvideo.mp4"
      icon="📈"
      color="#96CEB4"
      features={['Technical Analysis', 'Trading Strategies', 'Risk Management', 'Portfolio Management', 'Forex', 'Stocks', 'Crypto', 'Investment']}
      courses={[
        { id: 501, title: 'Financial Markets Basics', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/hero-background.png' },
        { id: 502, title: 'Technical Analysis Mastery', level: 'Intermediate', duration: '8 weeks', price: '$99', image: '/assets/hero-background.png' },
        { id: 503, title: 'Fundamental Analysis', level: 'Intermediate', duration: '6 weeks', price: '$79', image: '/assets/hero-background.png' },
        { id: 504, title: 'Trading Strategies', level: 'Advanced', duration: '10 weeks', price: '$129', image: '/assets/hero-background.png' },
        { id: 505, title: 'Risk Management Pro', level: 'Advanced', duration: '6 weeks', price: '$89', image: '/assets/hero-background.png' },
        { id: 506, title: 'Professional Trader Certification', level: 'Expert', duration: '16 weeks', price: '$249', image: '/assets/hero-background.png' },
      ]}
    />
  );
};

export default FinancialMarketsPage;