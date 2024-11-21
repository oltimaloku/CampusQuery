import React, { useState, useEffect } from 'react';
import {
    useParams
  } from "react-router-dom";
import { API_URL, RoomData } from '../constants';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the Data Grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the Data Grid
import { ColDef } from 'ag-grid-community';

function BuildingDetails() {
    const [data, setData] = useState<RoomData[]>([]);
    const [columnDefs] = useState([
        { headerName: 'Room Name', field: "c2rooms_name" } as ColDef,
        { headerName: 'Building Name', field: "c2rooms_fullname" } as ColDef,
        { headerName: 'Address', field: "c2rooms_address" } as ColDef,
        { headerName: 'Seats', field: "c2rooms_seats" } as ColDef,
        { headerName: 'Type', field: "c2rooms_type" } as ColDef,
        { headerName: 'Furniture', field: "c2rooms_furniture" } as ColDef,
        { headerName: 'Link', field: "c2rooms_href" } as ColDef,
    ]);

    let { shortName } = useParams();

    useEffect(() => {
		const fetchRooms = async () => {
			const query = {
				WHERE: {
                    IS: {c2rooms_shortname: shortName}
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
				const response = await fetch(API_URL+"query/", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(query),
				});

				const data = await response.json();
				console.log(data);
				if (data.result) {
					const roomData = data.result as RoomData[];
					setData(roomData);
				} else {
					console.error("Error fetching data:", data.error);
				}
			} catch (error) {
				console.error("Network error:", error);
			}
		};

		fetchRooms();
	}, []);
    return (
 // wrapping container with theme & size
 <div
  className="ag-theme-quartz" // applying the Data Grid theme
  style={{ height: 500 }} // the Data Grid will fill the size of the parent container
 >
   <AgGridReact
       rowData={data}
       columnDefs={columnDefs}
   />
 </div>
    )
}

export default BuildingDetails