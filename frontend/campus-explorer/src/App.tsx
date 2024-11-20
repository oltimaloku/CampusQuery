import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NavBar from "./components/NavBar";
import MapContainer from "./components/MapContainer";

const App = () => {
	return (
		<>
			<NavBar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/map" element={<MapContainer />} />
			</Routes>
		</>
	);
};

export default App;
