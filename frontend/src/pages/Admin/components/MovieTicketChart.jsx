import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export const MovieTicketChart = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchData = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/totalTicketPerMovie`,
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
        <h3 className="admin-chart-title">Vé bán theo phim</h3>
        <div className="admin-chart-loading">Đang tải...</div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.name?.length > 15 ? item.name.slice(0, 15) + "..." : item.name,
    tickets: Number(item.tickets_per_movie || 0),
  }));

  return (
    <div className="admin-chart-card">
      <h3 className="admin-chart-title">Vé bán theo phim</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#313441" />
          <XAxis
            dataKey="name"
            stroke="#babbc0"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#babbc0" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#252938",
              border: "1px solid #313441",
              borderRadius: 8,
              color: "#e6e6e8",
            }}
            formatter={(val) => [val, "Vé"]}
          />
          <Bar dataKey="tickets" fill="#f59eae" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
