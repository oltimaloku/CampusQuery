import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./components/NavBar";
import MapContainer from "./components/MapContainer";
import { LoadScript } from "@react-google-maps/api";
import { GOOGLE_API_KEY } from "./constants";
import BuildingDetails from "./pages/BuildingDetails";

const App = () => {
	return (
		<>
			<LoadScript googleMapsApiKey={GOOGLE_API_KEY}>
				<NavBar />
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/map" element={<MapContainer />} />
          <Route path="/building/:shortName" element={<BuildingDetails />} />
				</Routes>
			</LoadScript>
		</>
	);
};

export default App;
