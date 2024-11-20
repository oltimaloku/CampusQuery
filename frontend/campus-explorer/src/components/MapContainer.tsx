import React, { useState, useEffect } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";

interface MarkerData {
	c2rooms_lat: number;
	c2rooms_lon: number;
	c2rooms_fullname: string;
	c2rooms_shortname: string;
	c2rooms_address: string;
}

const MapContainer = () => {
	const [markers, setMarkers] = useState<MarkerData[]>([]);

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
					COLUMNS: [
						"c2rooms_shortname",
						"c2rooms_fullname",
						"c2rooms_seats",
						"c2rooms_furniture",
						"c2rooms_lat",
						"c2rooms_lon",
					],
				},
			};

			try {
				const response = await fetch("http://localhost:4321/query", {
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
					//console.error("Error fetching data:", data.error);
				}
			} catch (error) {
				//console.error("Network error:", error);
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
				/>
			))}
		</GoogleMap>
	);
};

export default MapContainer;
