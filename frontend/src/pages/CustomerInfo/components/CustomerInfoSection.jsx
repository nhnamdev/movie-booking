import axios from "axios";
import { useEffect, useState } from "react";
import {
  HiCalendar,
  HiOutlineClock,
  HiOutlineCurrencyBangladeshi,
  HiOutlineMapPin,
  HiOutlineTicket,
  HiOutlineTv,
} from "react-icons/hi2";
import { RiSofaLine } from "react-icons/ri";
import { GiPopcorn } from "react-icons/gi";
import { FiGift, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import HashLoader from "react-spinners/esm/HashLoader.js";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

const paymentStatusLabels = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
};
const fulfillmentStatusLabels = {
  PENDING: "Chờ quầy tiếp nhận",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng nhận",
  PICKED_UP: "Đã nhận",
};

export const CustomerInfoSection = () => {
  const [cusProData, setCusProData] = useState({});
  const [cusTicketData, setCusTicketData] = useState([]);
  const [rewardData, setRewardData] = useState(null);
  const override = {
    display: "block",
    margin: "2.4rem auto",
  };

  const { signedPerson } = useSelector((store) => store.authentication);

  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [loadingRewards, setLoadingRewards] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/customerProfile`,
          {
            email: signedPerson.email,
          }
        );
        setCusProData(response.data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading1(false);
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/customerPurchases`,
          {
            email: signedPerson.email,
          }
        );
        const purchases = Array.isArray(response.data) ? response.data : [];
        const formattedData = purchases.map((dataObj) => {
          const purDate = dataObj.purchase_date ? new Date(dataObj.purchase_date).toLocaleDateString("vi-VN") : "--";
          const showDate = dataObj.showtime_date ? new Date(`${dataObj.showtime_date}T00:00:00`).toLocaleDateString("vi-VN") : null;
          return {
            ...dataObj,
            showtime_date: showDate,
            purchase_date: purDate,
          };
        });
        setCusTicketData(formattedData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading2(false);
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/customerRewards`,
          { email: signedPerson.email }
        );
        setRewardData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRewards(false);
      }
    };

    fetchData();
  }, [signedPerson]);
  const purchaseHtml = cusTicketData.map((cusTicket, id) => {
    const paymentStatus = String(cusTicket.payment_status || "PAID").toUpperCase();
    const isConcessionOrder = cusTicket.order_type === "CONCESSION";
    const PurchaseWrapper = cusTicket.movie_id ? Link : "article";

    return (
      <PurchaseWrapper
        key={id}
        {...(cusTicket.movie_id ? { to: `/movieDetails/${cusTicket.movie_id}` } : {})}
        className="purchase-history-item"
      >
        <div className="purchase-first-gap"></div>
        <div className="purchase-second-gap"></div>

        <div className="purchase-item-details">
          <div className="purchase-item-header">
            <h2>{cusTicket.movie_name}</h2>

            {!isConcessionOrder ? <div className="purchase-show-quality">
              <HiOutlineTv size={18} />
              <p>{cusTicket.show_type}</p>
            </div> : null}
          </div>

          {cusTicket.ticket_ids ? <div className="purchase-ticket-id">
            <HiOutlineTicket size={16} />
            <p className="ticket-id">Mã vé: {cusTicket.ticket_ids}</p>
          </div> : null}

          <div className="purchase-hall-info">
            <HiOutlineMapPin size={18} />
            <p>
              {cusTicket.theatre_name}{cusTicket.hall_name ? ` - ${cusTicket.hall_name}` : ""}
            </p>
          </div>

          {cusTicket.seat_numbers ? <div className="purchase-seat">
            <RiSofaLine size={20} />
            <p>{cusTicket.seat_numbers}</p>
          </div> : null}

          {cusTicket.combo_items?.length ? (
            <div className="purchase-seat">
              <GiPopcorn size={20} />
              <p>
                {cusTicket.combo_items
                  .map((combo) => `${combo.name} ×${combo.quantity}`)
                  .join(", ")}
              </p>
            </div>
          ) : null}

          {cusTicket.combo_items?.length ? (
            <div className="purchase-seat">
              <GiPopcorn size={20} />
              <p>{fulfillmentStatusLabels[cusTicket.fulfillment_status] || "Chờ quầy tiếp nhận"}</p>
            </div>
          ) : null}

          {cusTicket.reward_points_used > 0 ? (
            <div className="purchase-seat purchase-reward-line">
              <FiGift size={20} />
              <p>Đã dùng {cusTicket.reward_points_used} điểm, giảm {Number(cusTicket.reward_discount).toLocaleString("vi-VN")}₫</p>
            </div>
          ) : null}

          {!isConcessionOrder ? <div className="purchase-date-time">
            <div className="purchase-tags">
              <HiCalendar size={20} />
              <strong>{cusTicket.showtime_date}</strong>
            </div>
            <div className="purchase-tags">
              <HiOutlineClock size={18} />
              <strong>{cusTicket.movie_start_time}</strong>
            </div>
          </div> : null}

          <div className="purchase-price-create">
            <div className="purchase-tags">
              <HiOutlineCurrencyBangladeshi size={18} />
              <strong>
                {Number(cusTicket.total_amount || cusTicket.ticket_price || 0).toLocaleString("vi-VN")}₫
              </strong>
            </div>
            <div className="purchase-tags">
              <span
                className={`purchase-payment-status is-${paymentStatus.toLowerCase()}`}
              >
                {paymentStatusLabels[paymentStatus] || paymentStatus}
              </span>
              <strong>{cusTicket.payment_method || "PayOS"}</strong>
            </div>
            <div className="purchase-tags">
              <p>
                Đã mua lúc <strong>{cusTicket.purchase_date}</strong>
              </p>
            </div>

          </div>

        </div>

        <div
          to={`/movieDetails/${cusTicket.movie_id}`}
          className="purchase-item-img-box"
        >
          <img
            className="purchase-item-img"
            src={resolveMediaUrl(cusTicket.movie_image || cusTicket.combo_items?.[0]?.imageUrl) || "/Images/features/food.webp"}
            alt={cusTicket.movie_name}
          />
        </div>
      </PurchaseWrapper>
    );
  });

  return (
    <div className="section-customer-info">
      <div className="container">
        <h3 className="customer-info-heading">Thông tin khách hàng</h3>
        {loading1 ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : (
          <div className="customer-info-details">
            <div>
              <p>Họ tên</p>
              <p>:</p>
              <p>
                {cusProData &&
                  `${cusProData.first_name} ${cusProData.last_name}`}
              </p>
            </div>

            <div>
              <p>Địa chỉ email</p>
              <p>:</p>
              <p>{cusProData.email}</p>
            </div>

            <div>
              <p>Số điện thoại</p>
              <p>:</p>
              <p>{cusProData.phone_number}</p>
            </div>
          </div>
        )}

        <h3 className="customer-info-heading">Điểm thưởng CGV</h3>
        {loadingRewards ? <HashLoader cssOverride={override} color="#eb3656" /> : rewardData ? (
          <section className="customer-rewards">
            <div className="customer-reward-summary">
              <div className="customer-reward-primary"><FiGift /><span><small>Điểm khả dụng</small><strong>{rewardData.account.availablePoints.toLocaleString("vi-VN")}</strong></span></div>
              <div><small>Điểm đang giữ</small><strong>{rewardData.account.heldPoints.toLocaleString("vi-VN")}</strong></div>
              <div><small>Tổng đã nhận</small><strong>{rewardData.account.lifetimeEarned.toLocaleString("vi-VN")}</strong></div>
              <div><small>Tổng đã dùng</small><strong>{rewardData.account.lifetimeRedeemed.toLocaleString("vi-VN")}</strong></div>
              {rewardData.account.lifetimeExpired > 0 ? <div><small>Đã hết hạn</small><strong>{rewardData.account.lifetimeExpired.toLocaleString("vi-VN")}</strong></div> : null}
            </div>
            <p className="customer-reward-rule">Mỗi {Number(rewardData.config.earnAmountPerPoint).toLocaleString("vi-VN")}₫ thực trả nhận 1 điểm · 1 điểm giảm {Number(rewardData.config.redeemValuePerPoint).toLocaleString("vi-VN")}₫{rewardData.config.pointExpiryDays ? ` · Điểm hết hạn sau ${rewardData.config.pointExpiryDays} ngày` : ""}.</p>
            <div className="customer-reward-history">
              <h4>Lịch sử điểm</h4>
              {rewardData.history.length ? rewardData.history.map((entry) => (
                <div className="customer-reward-entry" key={entry.id}>
                  <span className={entry.entry_type === "EARN" ? "is-earn" : "is-redeem"}>{entry.entry_type === "EARN" ? <FiTrendingUp /> : <FiTrendingDown />}</span>
                  <div><strong>{entry.description}</strong><small>{new Date(entry.created_at).toLocaleString("vi-VN")} · Số dư {Number(entry.balance_after).toLocaleString("vi-VN")}</small></div>
                  <b className={Number(entry.points_delta) >= 0 ? "is-positive" : "is-negative"}>{Number(entry.points_delta) > 0 ? "+" : ""}{entry.points_delta}</b>
                </div>
              )) : <p className="customer-empty-status">Chưa có giao dịch điểm thưởng.</p>}
            </div>
          </section>
        ) : <p className="customer-empty-status">Không thể tải thông tin điểm thưởng.</p>}

        <h3 className="customer-info-heading">Lịch sử mua hàng</h3>
        {loading2 ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : (
          <>
            {cusTicketData.length === 0 && (
              <p className="customer-empty-status">
                Bạn chưa có đơn hàng nào.
              </p>
            )}
            <div className="purchase-history-section">
              <div className="purchase-history-list">{purchaseHtml}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
