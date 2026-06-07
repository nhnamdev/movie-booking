import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = {
  "Đã thanh toán": "#10b981",
  "Chờ thanh toán": "#f59e0b",
  "Đã hủy": "#ef4444",
};

export const OrderStatusChart = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const password = signedPerson?.password;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email || !password) return;

    const fetchData = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/adminOrderStatusStats`,
          { email, password }
        );
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email, password]);

  if (loading) {
    return (
      <div className="admin-chart-card">
        <h3 className="admin-chart-title">Trạng thái đơn hàng</h3>
        <div className="admin-chart-loading">Đang tải...</div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="admin-chart-card">
      <h3 className="admin-chart-title">Trạng thái đơn hàng</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || "#6b7280"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#252938",
              border: "1px solid #313441",
              borderRadius: 8,
              color: "#e6e6e8",
            }}
            formatter={(val) => [`${val} (${total ? ((val / total) * 100).toFixed(1) : 0}%)`]}
          />
          <Legend
            wrapperStyle={{ color: "#babbc0", fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
