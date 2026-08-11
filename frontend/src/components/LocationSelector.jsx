import { useEffect, useRef, useState } from "react";
import axios from "axios";

import HashLoader from "react-spinners/esm/HashLoader.js";
import { useDispatch, useSelector } from "react-redux";
import { selectLocation } from "../reducers/locationSlice";
import { resetCart } from "../reducers/cartSlice";

export const LocationSelector = ({ paymentOngoing }) => {
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const selectedLocationIdRef = useRef("");

  const userLocation = useSelector((store) => store.currentLocation);
  const dispatch = useDispatch();

  useEffect(() => {
    selectedLocationIdRef.current = userLocation.id;
  }, [userLocation.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/theatres`
        );

        setLocationData(response.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  const locationOptions = locationData?.map((location, idx) => {
    return (
      <option key={idx} value={location.id}>
        {location.name}
      </option>
    );
  });

  const handleLocationSelection = (e) => {
    const val = e.target.value;
    if (val === "") {
      dispatch(resetCart());
      dispatch(selectLocation({ id: "", location: "", name: "", location_details: "" }));
      return;
    }

    const selectedLocationObj = locationData.find(
      (locationObj) => locationObj.id === Number(val)
    );

    if (!selectedLocationObj) return;

    if (selectedLocationObj.id !== userLocation.id) {
      dispatch(resetCart());
    }

    dispatch(selectLocation(selectedLocationObj));
  };

  return !loading ? (
    <div className="location-select-container ">
      <select
        id="location-selector"
        onChange={handleLocationSelection}
        value={userLocation?.id || ""}
        disabled={loading || paymentOngoing}
      >
        <option value="">-- Chọn rạp chiếu --</option>
        {locationOptions}
      </select>

      {userLocation?.id && (
        <p className="selected-theatre">
          Địa chỉ: <span>{userLocation?.location_details}</span>
        </p>
      )}
    </div>
  ) : (
    <HashLoader color="#eb3656" />
  );
};
