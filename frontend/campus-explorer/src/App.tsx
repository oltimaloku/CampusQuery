import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./components/NavBar";
import MapContainer from "./components/MapContainer";
import { LoadScript } from "@react-google-maps/api";
import { GOOGLE_API_KEY } from "./constants";

const App = () => {
	return (
		<>
			<LoadScript googleMapsApiKey={GOOGLE_API_KEY}>
				<NavBar />
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/map" element={<MapContainer />} />
				</Routes>
			</LoadScript>
		</>
	);
};

export default App;
