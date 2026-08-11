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
        if (!selectedLocationIdRef.current && response.data.length > 0) {
          dispatch(selectLocation(response.data[0]));
        }
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
        {location.location}
      </option>
    );
  });

  const handleLocationSelection = (e) => {
    const selectedLocationObj = locationData.find(
      (locationObj) => locationObj.id === Number(e.target.value)
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
        value={userLocation?.id}
        disabled={loading || paymentOngoing}
      >
        {locationOptions}
      </select>

      <p className="selected-location">
        Location: <span>{userLocation?.location}</span>
      </p>
      <p className="selected-theatre">
        Theatre: <span>{userLocation?.name}</span>
      </p>
    </div>
  ) : (
    <HashLoader color="#eb3656" />
  );
};
