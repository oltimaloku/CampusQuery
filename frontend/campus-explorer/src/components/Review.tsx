import { useState } from "react";
import { API_URL, RoomData } from "../constants";

export const CustomButton: React.FC<CustomButtonProps> = ({ data, handleShowReviews, setRating, setSelectedRoom, setRatingData }) => {
	return (
		<button
			onClick={() => handleShowReviews(data, setRating, setSelectedRoom, setRatingData)}
			className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
			Show Reviews
		</button>
	);
};

export interface CustomButtonProps {
	data: RoomData;
	handleShowReviews: (room: RoomData, 
        setRating: React.Dispatch<React.SetStateAction<number | null>>, 
        setSelectedRoom: React.Dispatch<React.SetStateAction<RoomData | null>>,
        setRatingData: React.Dispatch<React.SetStateAction<RatingData>>) => void;
    setRating: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedRoom: React.Dispatch<React.SetStateAction<RoomData | null>>;
    setRatingData: React.Dispatch<React.SetStateAction<RatingData>>;

}

export interface RatingData {
	ratingSum: number;
	numOfRatings: number;
}

export const handleShowReviews = async (room: RoomData, 
    setRating: React.Dispatch<React.SetStateAction<number | null>>, 
    setSelectedRoom: React.Dispatch<React.SetStateAction<RoomData | null>>,
    setRatingData: React.Dispatch<React.SetStateAction<RatingData>>
    ) => {
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

export const calculateAverageRating = (ratingData: RatingData): number => {
    if (ratingData.numOfRatings === 0) return 0;
    return Number((ratingData.ratingSum / ratingData.numOfRatings).toFixed(1));
};