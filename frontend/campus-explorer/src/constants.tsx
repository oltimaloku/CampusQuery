export const API_URL = "http://localhost:4321/";
export const GOOGLE_API_KEY = "AIzaSyDs2UYCKuX612F1p4KbBi-JBQz-TO29w3A";

export interface RoomData {
    c2rooms_shortname: string;
    c2rooms_fullname: string;
    c2rooms_seats: number;
    c2rooms_number: string;
    c2rooms_name: string;
    c2rooms_address: string;
    c2rooms_type: string;
    c2rooms_furniture: string;
    c2rooms_href: string;
}

export interface MarkerData {
	c2rooms_lat: number;
	c2rooms_lon: number;
	c2rooms_fullname: string;
	c2rooms_shortname: string;
	c2rooms_address: string;
}
