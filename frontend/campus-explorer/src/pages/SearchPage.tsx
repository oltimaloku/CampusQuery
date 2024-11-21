import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL, RoomData } from "../constants";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef } from "ag-grid-community";
import { calculateAverageRating, CustomButton, CustomButtonProps, handleShowReviews, RatingData } from "../components/Review";

function SearchPage() {
	const [data, setData] = useState<RoomData[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
    const [rating, setRating] = useState<number | null>(null);
    const [ratingData, setRatingData] = useState<RatingData>({ ratingSum: 0, numOfRatings: 0 });

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
			cellRenderer: (params: any) => <CustomButton
            data={params.data}
            handleShowReviews={handleShowReviews}
            setRating={setRating}
            setSelectedRoom={setSelectedRoom}
            setRatingData={setRatingData}/>,
		},
	]);

	useEffect(() => {
		fetchRooms();
	});

	const fetchRooms = async () => {
		const query = {
			WHERE: {
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
					ratingSum: prev.ratingSum + rating!,
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
				<AgGridReact rowData={data} columnDefs={columnDefs} domLayout="normal"/>
			</div>

			{selectedRoom && (
				<div className="mt-8 p-4 border rounded-lg">
					<h2 className="text-xl font-bold mb-4">Reviews for {selectedRoom.c2rooms_name}</h2>
					<div className="mb-6">
						<div className="bg-gray-100 p-4 rounded-lg text-center">
							<p className="text-2xl font-bold text-blue-600">{calculateAverageRating(ratingData)}/5</p>
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

export default SearchPage;
