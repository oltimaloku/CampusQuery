import React, { useState, useEffect } from "react";
import { GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { API_URL, MarkerData } from "../constants";
import { Link } from "react-router-dom";

const MapContainer = () => {
	const [markers, setMarkers] = useState<MarkerData[]>([]);
	const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

	const mapStyles = {
		height: "600px",
		width: "100%",
	};

	const defaultCenter = {
		lat: 49.2606,
		lng: -123.246,
	};

	useEffect(() => {
		const fetchBuildings = async () => {
			const query = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["c2rooms_shortname", "c2rooms_fullname", "c2rooms_lat", "c2rooms_lon", "c2rooms_address"],
				},
				TRANSFORMATIONS: {
					GROUP: ["c2rooms_shortname", "c2rooms_fullname", "c2rooms_lat", "c2rooms_lon", "c2rooms_address"],
					APPLY: [],
				},
			};

			try {
				const response = await fetch(API_URL + "query/", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(query),
				});

				const data = await response.json();
				console.log(data);
				if (data.result) {
					const markerData = data.result as MarkerData[];
					for (let marker in markerData) {
						console.log(marker);
					}
					setMarkers(markerData);
				} else {
					console.error("Error fetching data:", data.error);
				}
			} catch (error) {
				console.error("Network error:", error);
			}
		};

		fetchBuildings();
	}, []);

	return (
		<GoogleMap mapContainerStyle={mapStyles} zoom={15} center={defaultCenter}>
			{markers.map((marker, index) => (
				<Marker
					key={index}
					position={{ lat: marker.c2rooms_lat, lng: marker.c2rooms_lon }}
					title={marker.c2rooms_fullname}
					onClick={() => setSelectedMarker(marker)}
					onMouseOver={() => {
						setSelectedMarker(marker);
					}}
				/>
			))}

			{selectedMarker && (
				<InfoWindow
					position={{ lat: selectedMarker.c2rooms_lat, lng: selectedMarker.c2rooms_lon }}
					onCloseClick={() => setSelectedMarker(null)}
				>
					<div>
						<h2>{selectedMarker.c2rooms_fullname}</h2>
						<p>{selectedMarker.c2rooms_address}</p>
						<p>Short Name: {selectedMarker.c2rooms_shortname}</p>
						<Link to={"/building/" + selectedMarker.c2rooms_shortname}>Building Details</Link>
					</div>
				</InfoWindow>
			)}
		</GoogleMap>
	);
};

export default MapContainer;
