import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export const BookingTimeChart = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchData = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminBookingTimeStats`,
          { email }
        );
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email]);

  if (loading) {
    return (
      <div className="admin-chart-card">
        <h3 className="admin-chart-title">Lượt đặt theo khung giờ</h3>
        <div className="admin-chart-loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-chart-card">
      <h3 className="admin-chart-title">Lượt đặt theo khung giờ</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#313441" />
          <XAxis dataKey="time" stroke="#babbc0" tick={{ fontSize: 12 }} />
          <YAxis stroke="#babbc0" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#252938",
              border: "1px solid #313441",
              borderRadius: 8,
              color: "#e6e6e8",
            }}
            formatter={(val) => [val, "Lượt đặt"]}
          />
          <Bar dataKey="bookings" fill="#93c5fd" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
