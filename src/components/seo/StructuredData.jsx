import PropTypes from "prop-types";
import { Helmet } from "react-helmet-async";

const StructuredData = ({ jsonLd = [] }) => {
  if (!Array.isArray(jsonLd) || jsonLd.length === 0) return null;

  return (
    <Helmet>
      {jsonLd.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

StructuredData.propTypes = {
  jsonLd: PropTypes.arrayOf(PropTypes.object),
};

StructuredData.defaultProps = {
  jsonLd: [],
};

export default StructuredData;
