import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";

export const MovieWiseTicket = () => {
  const { signedPerson } = useSelector((store) => store.authentication);
  const email = signedPerson?.email;
  const [ticketData, setTicketData] = useState([]);

  useEffect(() => {
    if (!email) return;

    const fetchData = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/totalTicketPerMovie`,
          { email }
        );
        setTicketData(response.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [email]);

  const ticketDataHtml = ticketData.map((ticket, idx) => {
    return (
      <div key={idx} className="movie-ticket">
        <p>{ticket.tickets_per_movie} vé</p>
        <p>{ticket.name}</p>
      </div>
    );
  });

  return (
    <section className="admin-movie-wise-ticket container">
      <div className="admin-section-heading">
        <p className="admin-section-kicker">Theo từng phim</p>
        <h3 className="form-admin-heading">Vé bán ra cho mỗi bộ phim</h3>
      </div>

      {ticketData.length > 0 ? (
        <div className="movie-ticket-container">{ticketDataHtml}</div>
      ) : (
        <p className="admin-empty-state">Chưa có dữ liệu vé theo phim.</p>
      )}
    </section>
  );
};
