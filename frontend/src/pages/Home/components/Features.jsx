import { useEffect, useState } from "react";
import axios from "axios";
import { Feature } from "./Feature";
import HashLoader from "react-spinners/esm/HashLoader.js";

export const Features = () => {
  const [featuresData, setFeaturesData] = useState([]);
  const override = {
    display: "block",
    margin: "2.4rem auto",
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/locationFeatures`
        );
        setFeaturesData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const featuresHtml = featuresData.map((feature, idx) => {
    return <Feature key={idx} {...feature} idx={idx} />;
  });

  return (
    <section className="section-features container">
      <h4 className="subheading">Trải nghiệm tại rạp</h4>
      <h2 className="section-features-heading heading-secondary">
        Âm thanh, hình ảnh và không gian được thiết kế cho một buổi xem phim
        trọn vẹn.
      </h2>

      {loading ? (
        <HashLoader cssOverride={override} color="#eb3656" />
      ) : (
        <div className="feature-contents">{featuresHtml}</div>
      )}
    </section>
  );
};
