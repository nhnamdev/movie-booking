import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch, useSelector } from "react-redux";
import { lazy, Suspense, useEffect } from "react";
import axios from "axios";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";

import "./styles/styles.css";
import "./styles/queries.css";
import "./styles/admin.css";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { SignupModal } from "./modals/SignupModal";
import { LoginModal } from "./modals/LoginModal";

import { MobileNav } from "./components/MobileNav";
import { PageLoader } from "./components/PageLoader";
import { ScrollToTop } from "./components/ScrollToTop";

import HomePage from "./pages/Home/HomePage";
import { API_URL } from "./utils/apiUrl";
import { finishAuthCheck, login } from "./reducers/authSlice";

const PurchasePage = lazy(() => import("./pages/Purchase/PurchasePage"));
const ShowtimesPage = lazy(() => import("./pages/Showtimes/ShowtimesPage"));
const MovieDetailsPage = lazy(() =>
  import("./pages/MovieDetails/MovieDetailsPage")
);
const AboutUsPage = lazy(() => import("./pages/AboutUs/AboutUsPage"));
const ConcessionsPage = lazy(() => import("./pages/Concessions/ConcessionsPage"));
const CustomerInfoPage = lazy(() =>
  import("./pages/CustomerInfo/CustomerInfoPage")
);
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));

const blurredStyle = {
  filter: "blur(5px)",
  pointerEvents: "none",
  userSelect: "none",
};

let sessionRequest;
const fetchCurrentSession = () => {
  if (!sessionRequest) sessionRequest = axios.get(`${API_URL}/auth/me`);
  return sessionRequest;
};

function App() {
  const { isAuthenticated, authChecked, signedPerson, signModalState, loginModalState } =
    useSelector((store) => store.authentication);
  const dispatch = useDispatch();
  const { menuState } = useSelector((store) => store.mobileNav);
  const currentPage = useLocation();

  useEffect(() => {
    fetchCurrentSession()
      .then((response) => {
        if (response.data.user) dispatch(login(response.data.user));
        else dispatch(finishAuthCheck());
      })
      .catch(() => dispatch(finishAuthCheck()));
  }, [dispatch]);

  if (!authChecked) return <PageLoader />;

  return (
    <>
      <div
        style={
          signModalState || loginModalState || menuState ? blurredStyle : {}
        }
      >
        <ToastContainer />

        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes key={currentPage.pathname} location={currentPage}>
            <Route path="/" element={<HomePage />} />

              {/*// Xác định địa chỉ /showtimes sẽ dẫn đến ShowTimesPage*/}
            <Route path="/showtimes" element={<ShowtimesPage />} />
            <Route path="/bap-nuoc" element={<ConcessionsPage />} />
            <Route
              element={
                <ProtectedRoute
                  condition={
                    isAuthenticated && signedPerson.person_type === "Customer"
                  }
                />
              }
            >
              <Route path="/purchase" element={<PurchasePage />} />
              <Route path="/customer" element={<CustomerInfoPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute
                  condition={
                    isAuthenticated && ["Admin", "Staff"].includes(signedPerson.person_type)
                  }
                />
              }
            >
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="/aboutus" element={<AboutUsPage />} />

            <Route
              path="/movieDetails"
              element={<Navigate replace to="/movieDetails/1" />}
            />

            <Route path="/movieDetails/:id" element={<MovieDetailsPage />} />
          </Routes>
        </Suspense>
      </div>

      {signModalState && <SignupModal />}
      {loginModalState && <LoginModal />}
      <MobileNav />
      {import.meta.env.PROD && <SpeedInsights />}
    </>
  );
}

export default App;
