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
        { id: 'financial-markets-demo', title: 'Financial Markets Basics', level: 'Beginner', duration: '4 weeks', price: '$49', image: '/assets/anlysis.jpg' },
      ]}
    />
  );
};

export default FinancialMarketsPage;
