import axios from "axios";
import { useState, useEffect } from "react";
import { FaMoneyBillWave, FaTicketAlt, FaUsers } from "react-icons/fa";
import { useSelector } from "react-redux";
import HashLoader from "react-spinners/HashLoader";

export const AdminDashboardPrimary = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const adminPayload = { email: signedPerson?.email, password: signedPerson?.password };
  const [ticketData, setTicketData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [loading3, setLoading3] = useState(true);

  useEffect(() => {
    if (!adminPayload.email || !adminPayload.password) return;

    const fetchData = async () => {
      try {
        const response1 = await axios.post(
          `${import.meta.env.VITE_API_URL}/totalTickets`,
          adminPayload
        );
        setTicketData(response1.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading1(false);
      }

      try {
        const response2 = await axios.post(
          `${import.meta.env.VITE_API_URL}/totalPayment`,
          adminPayload
        );
        setPaymentData(response2.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading2(false);
      }

      try {
        const response3 = await axios.post(
          `${import.meta.env.VITE_API_URL}/totalCustomers`,
          adminPayload
        );
        setCustomerData(response3.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading3(false);
      }
    };

    fetchData();
  }, [adminPayload.email, adminPayload.password]);

  const revenueValue = Number(paymentData[0]?.total_amount || 0);

  return (
    <section className="section-admin-summary container">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Hiệu suất hôm nay</p>
        <h2 className="form-admin-heading dash-heading">Tóm tắt</h2>
      </div>

      <div className="admin-dashboard-primary">
        <div className="dashboard-pri-card">
          <FaTicketAlt className="admin-icon" aria-hidden="true" />
          {loading1 ? (
            <HashLoader size={30} color="#eb3656" />
          ) : (
            <p className="admin-dashboard-val">
              {ticketData[0]?.total_tickets || 0}
            </p>
          )}
          <p className="admin-dashboard-category">Tổng số vé đã bán</p>
        </div>

        <div className="dashboard-pri-card">
          <FaMoneyBillWave className="admin-icon" aria-hidden="true" />
          {loading2 ? (
            <HashLoader size={30} color="#eb3656" />
          ) : (
            <p className="admin-dashboard-val">
              {Number.isFinite(revenueValue)
                ? revenueValue.toLocaleString("vi-VN")
                : "0"}{" "}
              VND
            </p>
          )}
          <p className="admin-dashboard-category">Tổng doanh thu</p>
        </div>

        <div className="dashboard-pri-card">
          <FaUsers className="admin-icon" aria-hidden="true" />
          {loading3 ? (
            <HashLoader size={26} color="#eb3656" />
          ) : (
            <p className="admin-dashboard-val">
              {customerData[0]?.total_customers || 0}
            </p>
          )}
          <p className="admin-dashboard-category">Tổng số khách hàng</p>
        </div>
      </div>
    </section>
  );
};
