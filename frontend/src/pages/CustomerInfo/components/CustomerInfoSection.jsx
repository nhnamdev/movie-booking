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
import HashLoader from "react-spinners/HashLoader";

const paymentStatusLabels = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
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
            password: signedPerson.password,
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
          const purDate = new Date(dataObj.purchase_date).toLocaleDateString(
            "vi-VN"
          );
          const showDate = new Date(dataObj.showtime_date).toLocaleDateString(
            "vi-VN"
          );
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
          { email: signedPerson.email, password: signedPerson.password }
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
  // Hàm hủy vé
const cancelTicket = async (ticketId) => {
  const confirmCancel = confirm("Bạn có chắc muốn hủy vé này không?");
  if (!confirmCancel) return;

  try {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/cancelOneTicket`, {
      ticketId: ticketId,
    });

    if (res.data.success) {
      alert("Hủy vé thành công!");
      // Cập nhật lại danh sách vé sau khi xóa
      setCusTicketData((prev) => prev.filter(ticket => ticket.ticket_ids !== ticketId));
    } else {
      alert("Hủy vé thất bại: " + res.data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Đã xảy ra lỗi khi hủy vé.");
  }
};


  const purchaseHtml = cusTicketData.map((cusTicket, id) => {
    const paymentStatus = String(cusTicket.payment_status || "PAID").toUpperCase();

    return (
      <Link
        key={id}
        to={`/movieDetails/${cusTicket.movie_id}`}
        className="purchase-history-item"
      >
        <div className="purchase-first-gap"></div>
        <div className="purchase-second-gap"></div>

        <div className="purchase-item-details">
          <div className="purchase-item-header">
            <h2>{cusTicket.movie_name}</h2>

            <div className="purchase-show-quality">
              <HiOutlineTv size={18} />
              <p>{cusTicket.show_type}</p>
            </div>
          </div>

          <div className="purchase-ticket-id">
            <HiOutlineTicket size={16} />
            <p className="ticket-id">Mã vé: {cusTicket.ticket_ids}</p>
          </div>

          <div className="purchase-hall-info">
            <HiOutlineMapPin size={18} />
            <p>
              {cusTicket.theatre_name} &mdash; {cusTicket.hall_name}
            </p>
          </div>

          <div className="purchase-seat">
            <RiSofaLine size={20} />
            <p>{cusTicket.seat_numbers}</p>
          </div>

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

          {cusTicket.reward_points_used > 0 ? (
            <div className="purchase-seat purchase-reward-line">
              <FiGift size={20} />
              <p>Đã dùng {cusTicket.reward_points_used} điểm, giảm {Number(cusTicket.reward_discount).toLocaleString("vi-VN")}₫</p>
            </div>
          ) : null}

          <div className="purchase-date-time">
            <div className="purchase-tags">
              <HiCalendar size={20} />
              <strong>{cusTicket.showtime_date}</strong>
            </div>
            <div className="purchase-tags">
              <HiOutlineClock size={18} />
              <strong>{cusTicket.movie_start_time}</strong>
            </div>
          </div>

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

            <button
              className="cancel-ticket-btn"
              onClick={(e) => {
                e.preventDefault(); // Ngăn mở trang khi bấm nút (vì đang trong <Link>)
                cancelTicket(cusTicket.ticket_ids); // Gọi hàm hủy vé
              }}
            >
              Hủy vé
            </button>
          </div>

        </div>

        <div
          to={`/movieDetails/${cusTicket.movie_id}`}
          className="purchase-item-img-box"
        >
          <img
            className="purchase-item-img"
            src={cusTicket.movie_image}
            alt={cusTicket.movie_name}
          />
        </div>
      </Link>
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
            </div>
            <p className="customer-reward-rule">Mỗi {Number(rewardData.config.earnAmountPerPoint).toLocaleString("vi-VN")}₫ thực trả nhận 1 điểm · 1 điểm giảm {Number(rewardData.config.redeemValuePerPoint).toLocaleString("vi-VN")}₫.</p>
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

        <h3 className="customer-info-heading">Lịch sử mua vé</h3>
        {loading2 ? (
          <HashLoader cssOverride={override} color="#eb3656" />
        ) : (
          <>
            {cusTicketData.length === 0 && (
              <p className="customer-empty-status">
                Bạn chưa mua vé nào.
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
