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
  const override = {
    display: "block",
    margin: "2.4rem auto",
  };

  const { signedPerson } = useSelector((store) => store.authentication);

  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);

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
              <strong>{cusTicket.ticket_price}</strong>
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
