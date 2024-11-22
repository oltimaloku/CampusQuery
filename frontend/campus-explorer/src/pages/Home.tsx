import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./Home.css";
import { API_URL } from "../constants";

// ... existing imports ...

function Home() {
	return (
		<div className="Home">
			<header className="Home-header">
				<h1>Campus Explorer</h1>
				<img
					src="https://gecliving.com/wp-content/uploads/2022/11/irving-k-barber-learning-1024x576.webp"
					className="Home-image"
					alt="UBC"
				/>
				<p>Welcome to the Campus Explorer.</p>
			</header>
		</div>
	);
}

export default Home;
