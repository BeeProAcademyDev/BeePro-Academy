import React from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { courseService } from '../../services/api';
import { useCurrency } from '../../contexts/CurrencyContext';
import { parseUsdPrice } from '../../lib/currency';
import './CategoryPage.css';

const CategoryPage = ({
  title,
  subtitle,
  description,
  backgroundImage,
  backgroundVideo,
  icon,
  color,
  categoryKey,
  features = [],
  hideHeroContent = false
}) => {
  const { formatCoursePrice } = useCurrency();
  const [dbCourses, setDbCourses] = useState([]);

  const formatDisplayPrice = (price) => {
    if (price == null || price === '') return formatCoursePrice(0).full
    return formatCoursePrice(parseUsdPrice(price)).full
  }

  useEffect(() => {
    let isMounted = true;

    const loadCategoryCourses = async () => {
      if (!categoryKey) return;

      try {
        const { data } = await courseService.getCoursesByCategory(categoryKey);
        const published = (data || [])
          .filter((course) => course.is_published !== false)
          .map((course) => ({
            id: course.id,
            title: course.title,
            level: course.level || 'All Levels',
            duration: course.duration ? `${course.duration} hours` : 'Self-paced',
            price: course.price ?? 0,
            image: course.thumbnail_url || backgroundImage
          }));

        if (isMounted) {
          setDbCourses(published);
        }
      } catch (error) {
        if (isMounted) {
          setDbCourses([]);
        }
      }
    };

    loadCategoryCourses();

    return () => {
      isMounted = false;
    };
  }, [categoryKey, backgroundImage]);

  const displayCourses = dbCourses

  return (
    <div className="category-page">
      {/* Hero Section */}
      <section className="category-hero" style={{ '--category-color': color }}>
        {backgroundVideo ? (
          <video
            className="category-hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster={backgroundImage}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        ) : (
          <div 
            className="category-hero-bg"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        <div className="category-hero-overlay" />
        {!hideHeroContent && (
          <div className="category-hero-content">
            <div className="category-hero-icon">{icon}</div>
            <h1 className="category-hero-title">{title}</h1>
            <p className="category-hero-subtitle">{subtitle}</p>
            <p className="category-hero-description">{description}</p>
            <div className="category-hero-features">
              {features.map((feature, idx) => (
                <span key={idx} className="category-hero-tag">{feature}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Courses Grid Section */}
      <section className="category-courses-section" style={{ '--courses-bg-image': `url(${backgroundImage})` }}>
        <div className="category-courses-container">
          <div className="category-courses-header">
            <h2>Available Courses</h2>
            <p>Explore our comprehensive courses designed to take you from beginner to expert</p>
          </div>
          <div className="category-courses-grid">
            {displayCourses.length > 0 ? (
              displayCourses.map((course) => (
                <div key={course.id} className="category-course-card" style={{ '--card-color': color }}>
                  <div 
                    className="category-course-image"
                    style={{ backgroundImage: `url(${course.image || backgroundImage})` }}
                  >
                    <span className="category-course-level">{course.level}</span>
                  </div>
                  <div className="category-course-content">
                    <h3>{course.title}</h3>
                    <div className="category-course-meta">
                      <span>⏱️ {course.duration}</span>
                      <span className="category-course-price">{formatDisplayPrice(course.price)}</span>
                    </div>
                    <Link to={`/courses/${course.id}`} className="category-course-btn">
                      View Course
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="category-courses-empty">
                <p>No published courses in this category yet.</p>
                <Link to="/courses" className="category-course-btn">Browse All Courses</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="category-cta-section" style={{ '--cta-color': color }}>
        <div className="category-cta-content">
          <h2>Ready to Start Learning?</h2>
          <p>Join thousands of students who have transformed their careers with our {title} courses</p>
          <div className="category-cta-buttons">
            <Link to="/register" className="category-cta-btn primary">Get Started Today</Link>
            <Link to="/contact" className="category-cta-btn secondary">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;
