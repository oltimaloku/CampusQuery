import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL, RoomData } from "../constants";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";

interface CustomButtonProps {
	data: RoomData;
	handleShowReviews: (room: RoomData) => void;
}

interface RatingData {
	ratingSum: number;
	numOfRatings: number;
}

const CustomButton: React.FC<CustomButtonProps> = ({ data, handleShowReviews }) => {
	return (
		<button
			onClick={() => handleShowReviews(data)}
			className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
			Show Reviews
		</button>
	);
};

function BuildingDetails() {
	const [data, setData] = useState<RoomData[]>([]);
	const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
	const [rating, setRating] = useState<number | null>(null);
	const [ratingData, setRatingData] = useState<RatingData>({ ratingSum: 0, numOfRatings: 0 });
	const { shortName } = useParams();

	const handleShowReviews = async (room: RoomData) => {
		setSelectedRoom(room);
		setRating(null);
		const roomShortname = room.c2rooms_shortname;
		const roomNumber = room.c2rooms_number;

		try {
			const response = await fetch(`${API_URL}review/${roomShortname}/${roomNumber}`, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			const data = await response.json();
			if (data.result && Array.isArray(data.result) && data.result.length === 2) {
				setRatingData({
					ratingSum: data.result[0],
					numOfRatings: data.result[1],
				});
			} else {
				setRatingData({ ratingSum: 0, numOfRatings: 0 });
			}
		} catch (error) {
			console.error("Error fetching reviews:", error);
			setRatingData({ ratingSum: 0, numOfRatings: 0 });
		}
	};

	const calculateAverageRating = (): number => {
		if (ratingData.numOfRatings === 0) return 0;
		return Number((ratingData.ratingSum / ratingData.numOfRatings).toFixed(1));
	};

	const [columnDefs] = useState<ColDef[]>([
		{ headerName: "Room Name", field: "c2rooms_name" },
		{ headerName: "Building Name", field: "c2rooms_fullname" },
		{ headerName: "Address", field: "c2rooms_address" },
		{ headerName: "Seats", field: "c2rooms_seats" },
		{ headerName: "Type", field: "c2rooms_type" },
		{ headerName: "Furniture", field: "c2rooms_furniture" },
		{ headerName: "Link", field: "c2rooms_href" },
		{
			headerName: "Actions",
			field: "actions",
			cellRenderer: (params: any) => <CustomButton data={params.data} handleShowReviews={handleShowReviews} />,
		},
	]);

	useEffect(() => {
		fetchRooms();
	}, [shortName]);

	const fetchRooms = async () => {
		const query = {
			WHERE: {
				IS: { c2rooms_shortname: shortName },
			},
			OPTIONS: {
				COLUMNS: [
					"c2rooms_shortname",
					"c2rooms_fullname",
					"c2rooms_seats",
					"c2rooms_number",
					"c2rooms_name",
					"c2rooms_address",
					"c2rooms_type",
					"c2rooms_furniture",
					"c2rooms_href",
				],
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
			if (data.result) {
				setData(data.result);
			} else {
				console.error("Error fetching data:", data.error);
			}
		} catch (error) {
			console.error("Network error:", error);
		}
	};

	const handleSubmitReview = async () => {
		if (selectedRoom && rating !== null) {
			const roomShortname = selectedRoom.c2rooms_shortname;
			const roomNumber = selectedRoom.c2rooms_number;

			try {
				await fetch(`${API_URL}review/${roomShortname}/${roomNumber}/${rating}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
				});

				// Update local rating data
				setRatingData((prev) => ({
					ratingSum: prev.ratingSum + rating,
					numOfRatings: prev.numOfRatings + 1,
				}));
				setRating(null);
			} catch (error) {
				console.error("Error submitting review:", error);
			}
		}
	};

	return (
		<div className="p-4">
			<div className="ag-theme-quartz" style={{ height: 500 }}>
				<AgGridReact rowData={data} columnDefs={columnDefs} domLayout="autoHeight" />
			</div>

			{selectedRoom && (
				<div className="mt-8 p-4 border rounded-lg">
					<h2 className="text-xl font-bold mb-4">Reviews for {selectedRoom.c2rooms_name}</h2>
					<div className="mb-6">
						<div className="bg-gray-100 p-4 rounded-lg text-center">
							<p className="text-2xl font-bold text-blue-600">{calculateAverageRating()}/5</p>
							<p className="text-gray-600">Average Rating</p>
							<p className="text-sm text-gray-500">({ratingData.numOfRatings} reviews)</p>
						</div>
					</div>
					<div className="flex gap-4 items-center">
						<label className="flex items-center gap-2">
							Add Rating (0-5):
							<input
								type="number"
								value={rating ?? ""}
								min={0}
								max={5}
								onChange={(e) => setRating(Number(e.target.value))}
								className="border rounded px-2 py-1 w-20"
							/>
						</label>
						<button
							onClick={handleSubmitReview}
							className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
							disabled={rating === null}
						>
							Submit
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default BuildingDetails;
