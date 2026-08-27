import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import HashLoader from "react-spinners/esm/HashLoader.js";

export const Footer = () => {
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/locationDetails`
        );
        setLocationData(response.data || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const locations = locationData.map((loc, idx) => {
    return (
      <p key={idx} className="address">
        {loc.location_details}
      </p>
    );
  });

  return (
    <section className="section-footer container">
      {isHomePage ? (
        <HashLink className="footer-logo-container" to="#headerTop">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="footer-logo-icon"
            viewBox="0 0 512 512"
          >
            <path
              d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M360 94.59V296M443.13 212.87L296 360M417.41 360H216M299.13 443.13l-144-144M152 416V216M68.87 299.13l144-144M94.59 152H288M212.87 68.87L360 216"
            />
          </svg>
          <h1 className="footer-logo-text">CGV VIETNAM</h1>
        </HashLink>
      ) : (
        <Link className="footer-logo-container" to="/">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="footer-logo-icon"
            viewBox="0 0 512 512"
          >
            <path
              d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="32"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M360 94.59V296M443.13 212.87L296 360M417.41 360H216M299.13 443.13l-144-144M152 416V216M68.87 299.13l144-144M94.59 152H288M212.87 68.87L360 216"
            />
          </svg>
          <h1 className="footer-logo-text">CGV VIETNAM</h1>
        </Link>
      )}

      <div className="footer-link-container foot-reg">
        <Link className="footer-link" to="/showtimes">
          Lịch chiếu phim
        </Link>
      </div>

      <div className="footer-link-container">
        <Link className="footer-link" to="/concessions">
          Bắp & Nước
        </Link>
      </div>

      <div className="footer-link-container">
        <Link className="footer-link" to="/aboutus">
          Về chúng tôi
        </Link>
      </div>

      <h3 className="footer-heading">Rạp của chúng tôi</h3>

      <p className="copyright">
        Copyright &copy; 2026 bởi CGV Việt Nam. 
        Ứng dụng này được phát triển nhằm nâng cao trải nghiệm đặt vé xem phim cho khách hàng CGV. Mọi nội dung và mã nguồn được thiết kế và phát hành bởi Nguyễn Hoàng Nam. Mọi sai sót xin liên hệ nhnam23304@gmail.com.
      </p>

      <div className="footer-address-container">
        {loading ? <HashLoader color="#eb3656" /> : locations}
      </div>
    </section>
  );
};
