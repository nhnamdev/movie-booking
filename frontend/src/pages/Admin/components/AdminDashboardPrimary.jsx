import { StatsCards } from "./StatsCards";
import { RevenueChart } from "./RevenueChart";
import { MovieTicketChart } from "./MovieTicketChart";
import { OrderStatusChart } from "./OrderStatusChart";
import { BookingTimeChart } from "./BookingTimeChart";
import { RecentOrders } from "./RecentOrders";
import { TopMovies } from "./TopMovies";

export const AdminDashboardPrimary = () => {
  return (
    <>
      <StatsCards />

      <div className="admin-chart-grid">
        <RevenueChart />
        <MovieTicketChart />
        <OrderStatusChart />
        <BookingTimeChart />
      </div>

      <div className="admin-data-grid">
        <RecentOrders />
        <TopMovies />
      </div>
    </>
  );
};
