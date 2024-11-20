import React from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { GOOGLE_API_KEY } from "../constants";

const MapContainer = () => {
	const mapStyles = {
		height: "600px",
		width: "100%",
	};

	const defaultCenter = {
		lat: 49.2606,
		lng: -123.246,
	};

	return (
		<GoogleMap mapContainerStyle={mapStyles} zoom={10} center={defaultCenter}>
			<Marker position={defaultCenter} />
		</GoogleMap>
	);
};

export default MapContainer;
