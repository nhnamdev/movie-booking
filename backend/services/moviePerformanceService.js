const createMoviePerformanceService = ({ queryDbAsync }) => {
  const getMoviePerformance = async ({ dateFrom = null, dateTo = null }) => {
    const rows = await queryDbAsync(
      `SELECT
        m.id,
        m.name,
        m.image_path,
        DATE_FORMAT(m.release_date, '%Y-%m-%d') AS release_date,
        DATE_FORMAT(m.end_date, '%Y-%m-%d') AS end_date,
        CASE
          WHEN m.end_date < CURDATE() THEN 'ended'
          WHEN m.release_date > CURDATE() THEN 'upcoming'
          ELSE 'showing'
        END AS screening_status,
        COUNT(slot.showtime_id) AS total_showtimes,
        COALESCE(SUM(slot.is_active), 0) AS active_showtimes,
        COALESCE(SUM(slot.is_cancelled), 0) AS cancelled_showtimes,
        COALESCE(SUM(slot.is_completed), 0) AS completed_showtimes,
        COALESCE(SUM(slot.ticket_count), 0) AS tickets_sold,
        COALESCE(SUM(slot.capacity), 0) AS seat_capacity,
        COALESCE(SUM(slot.full_showtime), 0) AS full_showtimes,
        COALESCE(SUM(slot.revenue), 0) AS ticket_revenue,
        COALESCE(checkout.checkout_count, 0) AS checkout_count,
        COALESCE(checkout.paid_order_count, 0) AS paid_order_count
       FROM movie m
       LEFT JOIN (
         SELECT
           si.movie_id,
           si.showtime_id,
           si.hall_id,
           CASE WHEN si.status = 'active' AND s.status = 'active' THEN 1 ELSE 0 END AS is_active,
           CASE WHEN si.status <> 'active' OR s.status <> 'active' THEN 1 ELSE 0 END AS is_cancelled,
           CASE
             WHEN si.status IN ('active', 'sales_closed') AND s.status IN ('active', 'sales_closed')
               AND TIMESTAMPADD(MINUTE, CAST(sm.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
             THEN 1 ELSE 0
           END AS is_completed,
           CASE
             WHEN si.status IN ('active', 'sales_closed') AND s.status IN ('active', 'sales_closed')
               AND TIMESTAMPADD(MINUTE, CAST(sm.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
             THEN COALESCE(ticket.ticket_count, 0)
             ELSE 0
           END AS ticket_count,
           CASE
             WHEN si.status IN ('active', 'sales_closed') AND s.status IN ('active', 'sales_closed')
               AND TIMESTAMPADD(MINUTE, CAST(sm.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
             THEN COALESCE(NULLIF(capacity.active_seats, 0), NULLIF(h.total_seats, 0), 0)
             ELSE 0
           END AS capacity,
           CASE
             WHEN si.status IN ('active', 'sales_closed') AND s.status IN ('active', 'sales_closed')
               AND TIMESTAMPADD(MINUTE, CAST(sm.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
               AND COALESCE(NULLIF(capacity.active_seats, 0), NULLIF(h.total_seats, 0), 0) > 0
               AND COALESCE(ticket.ticket_count, 0) >= COALESCE(NULLIF(capacity.active_seats, 0), NULLIF(h.total_seats, 0), 0)
             THEN 1 ELSE 0
           END AS full_showtime,
           CASE
             WHEN si.status IN ('active', 'sales_closed') AND s.status IN ('active', 'sales_closed')
               AND TIMESTAMPADD(MINUTE, CAST(sm.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
             THEN COALESCE(ticket.revenue, 0)
             ELSE 0
           END AS revenue
         FROM shown_in si
         JOIN showtimes s ON s.id = si.showtime_id
         JOIN movie sm ON sm.id = si.movie_id
         JOIN hall h ON h.id = si.hall_id
         LEFT JOIN (
           SELECT hall_id, COUNT(*) AS active_seats
           FROM hallwise_seat
           WHERE is_active = 1
           GROUP BY hall_id
         ) capacity ON capacity.hall_id = si.hall_id
         LEFT JOIN (
           SELECT movie_id, hall_id, showtimes_id, COUNT(*) AS ticket_count, SUM(price) AS revenue
           FROM ticket
           GROUP BY movie_id, hall_id, showtimes_id
         ) ticket
           ON ticket.movie_id = si.movie_id
          AND ticket.hall_id = si.hall_id
          AND ticket.showtimes_id = si.showtime_id
         WHERE (? IS NULL OR s.showtime_date >= ?)
           AND (? IS NULL OR s.showtime_date <= ?)
       ) slot ON slot.movie_id = m.id
       LEFT JOIN (
         SELECT
           CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(payload_json), payload_json, '{}'), '$.userMovieId')) AS UNSIGNED) AS movie_id,
           COUNT(*) AS checkout_count,
           SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_order_count
         FROM payos_orders
         WHERE JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(payload_json), payload_json, '{}'), '$.userMovieId')) REGEXP '^[0-9]+$'
           AND (? IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.showtimeDate')) >= ?)
           AND (? IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.showtimeDate')) <= ?)
         GROUP BY movie_id
       ) checkout ON checkout.movie_id = m.id
       GROUP BY
         m.id, m.name, m.image_path, m.release_date, m.end_date,
         checkout.checkout_count, checkout.paid_order_count
       ORDER BY tickets_sold DESC, active_showtimes DESC, m.name ASC`,
      [dateFrom, dateFrom, dateTo, dateTo, dateFrom, dateFrom, dateTo, dateTo]
    );

    const movies = rows.map((row) => {
      const ticketsSold = Number(row.tickets_sold || 0);
      const seatCapacity = Number(row.seat_capacity || 0);
      const activeShowtimes = Number(row.active_showtimes || 0);
      const fullShowtimes = Number(row.full_showtimes || 0);
      const checkoutCount = Number(row.checkout_count || 0);
      const paidOrderCount = Number(row.paid_order_count || 0);
      return {
        ...row,
        total_showtimes: Number(row.total_showtimes || 0),
        active_showtimes: activeShowtimes,
        cancelled_showtimes: Number(row.cancelled_showtimes || 0),
        completed_showtimes: Number(row.completed_showtimes || 0),
        tickets_sold: ticketsSold,
        seat_capacity: seatCapacity,
        full_showtimes: fullShowtimes,
        ticket_revenue: Number(row.ticket_revenue || 0),
        checkout_count: checkoutCount,
        paid_order_count: paidOrderCount,
        occupancy_rate: seatCapacity > 0 ? Number(((ticketsSold / seatCapacity) * 100).toFixed(1)) : 0,
        full_showtime_rate: Number(row.completed_showtimes || 0) > 0 ? Number(((fullShowtimes / Number(row.completed_showtimes)) * 100).toFixed(1)) : 0,
        purchase_rate: checkoutCount > 0 ? Number(((paidOrderCount / checkoutCount) * 100).toFixed(1)) : null,
      };
    });

    const summary = movies.reduce(
      (result, movie) => ({
        total_movies: result.total_movies + (movie.total_showtimes > 0 ? 1 : 0),
        total_showtimes: result.total_showtimes + movie.total_showtimes,
        tickets_sold: result.tickets_sold + movie.tickets_sold,
        seat_capacity: result.seat_capacity + movie.seat_capacity,
        full_showtimes: result.full_showtimes + movie.full_showtimes,
        active_showtimes: result.active_showtimes + movie.active_showtimes,
        completed_showtimes: result.completed_showtimes + movie.completed_showtimes,
        checkout_count: result.checkout_count + movie.checkout_count,
        paid_order_count: result.paid_order_count + movie.paid_order_count,
        ticket_revenue: result.ticket_revenue + movie.ticket_revenue,
      }),
      {
        total_movies: 0,
        total_showtimes: 0,
        tickets_sold: 0,
        seat_capacity: 0,
        full_showtimes: 0,
        active_showtimes: 0,
        completed_showtimes: 0,
        checkout_count: 0,
        paid_order_count: 0,
        ticket_revenue: 0,
      }
    );

    return {
      summary: {
        ...summary,
        occupancy_rate: summary.seat_capacity > 0
          ? Number(((summary.tickets_sold / summary.seat_capacity) * 100).toFixed(1))
          : 0,
        full_showtime_rate: summary.completed_showtimes > 0
          ? Number(((summary.full_showtimes / summary.completed_showtimes) * 100).toFixed(1))
          : 0,
        purchase_rate: summary.checkout_count > 0
          ? Number(((summary.paid_order_count / summary.checkout_count) * 100).toFixed(1))
          : null,
      },
      movies,
    };
  };

  return { getMoviePerformance };
};

module.exports = createMoviePerformanceService;
