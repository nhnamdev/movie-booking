import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export const RevenueChart = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchData = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminRevenueStats`,
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

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const formatVND = (val) => {
    if (!val) return "0";
    return val.toLocaleString("vi-VN") + "₫";
  };

  if (loading) {
    return (
      <div className="admin-chart-card">
        <h3 className="admin-chart-title">Doanh thu theo ngày</h3>
        <div className="admin-chart-loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-chart-card">
      <h3 className="admin-chart-title">Doanh thu theo ngày</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#313441" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#babbc0"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#babbc0"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => (v / 1000000).toFixed(1) + "M"}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#252938",
              border: "1px solid #313441",
              borderRadius: 8,
              color: "#e6e6e8",
            }}
            formatter={(val) => [formatVND(val), "Doanh thu"]}
            labelFormatter={(label) => `Ngày: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#eb3656"
            strokeWidth={2}
            dot={{ fill: "#eb3656", r: 3 }}
            activeDot={{ r: 5, fill: "#f59eae" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
