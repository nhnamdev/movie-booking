import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import { showLoginModal } from "../../../reducers/authSlice";
import { resetCart } from "../../../reducers/cartSlice";
import { TextEffect } from "../../../components/TextEffect";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signedPerson } = useSelector(
    (store) => store.authentication
  );
  const dispatch = useDispatch();

  return (
    <section className="section-hero">
      <div className="container hero">
        <div className="hero-text">
          <p className="hero-kicker">CGV Việt Nam</p>
          <h1 className="heading-primary">
            <TextEffect preset="slide">
              Đặt vé nhanh cho những bộ phim bạn đang chờ
            </TextEffect>
          </h1>

          <p className="hero-description">
            Chọn rạp, suất chiếu và ghế ngồi trong vài bước. Trải nghiệm lịch
            chiếu rõ ràng, đặt vé dễ dàng và lưu lịch sử mua vé ngay trong tài
            khoản của bạn.
          </p>

          <div className="hero-btn-container">
            <button
              onClick={() => {
                dispatch(resetCart());
                isAuthenticated && signedPerson.person_type === "Customer"
                  ? navigate("/purchase")
                  : dispatch(showLoginModal());
              }}
              className="btn btn-full"
            >
              Đặt vé ngay
            </button>
            <HashLink to="#nowShowing" className="btn btn-outline">
              Xem phim đang chiếu
            </HashLink>
          </div>

          <div className="hero-proof-grid" aria-label="Điểm nổi bật">
            <div>
              <strong>Nhiều chi nhánh</strong>
              <span>chọn rạp phù hợp</span>
            </div>
            <div>
              <strong>2D và 3D</strong>
              <span>phòng tiêu chuẩn, cao cấp</span>
            </div>
            <div>
              <strong>Điểm thưởng</strong>
              <span>tích điểm theo đơn đã trả</span>
            </div>
          </div>

          <div className="hero-review-section">
            <div className="customers-img">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <img
                  key={item}
                  src={`/Images/customers/customer-${item}.jpg`}
                  className="customer-img"
                  alt="Khách hàng CGV"
                />
              ))}
            </div>

            <p className="hero-review-text">
              <span>Khán giả quay lại mỗi tuần</span> nhờ quy trình đặt vé rõ
              ràng
            </p>
          </div>
        </div>

        <div className="hero-img-box">
          <div className="hero-img-panel">
            <p>Đang chiếu hôm nay</p>
            <strong>Suất tối bán chạy</strong>
          </div>
          <img
            className="hero-img"
            src="/Images/hero-img.webp"
            alt="Không gian điện ảnh CGV"
          />
        </div>
      </div>
    </section>
  );
};
