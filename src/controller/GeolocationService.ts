import http from "http";

interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export default class GeolocationService {
	private uri = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team/";

	public static async getGeolocation(address: string): Promise<GeoResponse> {
		const encodedAddress = encodeURIComponent(address);
		const uri = `${new GeolocationService().uri}/${encodedAddress}`;

		return new Promise((resolve, reject) => {
			http
				.get(uri, (res) => {
					let data = "";

					res.on("data", (chunk) => {
						data += chunk;
					});

					res.on("end", () => {
						try {
							const geoResponse: GeoResponse = JSON.parse(data);
							resolve(geoResponse);
						} catch (error) {
							reject({ error: "Failed to parse response" + error });
						}
					});
				})
				.on("error", (err) => {
					reject({ error: err.message });
				});
		});
	}
}
