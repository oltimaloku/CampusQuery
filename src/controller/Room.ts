export default class Room {
	private readonly fullname: string;
	private readonly shortname: string;
	private readonly number: string;
	private readonly name: string;
	private readonly address: string;
	private readonly lat: number;
	private readonly lon: number;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string;

	public constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = name;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
	}

	public static createRoom(room: any): Room | null {
		if (!room || typeof room !== "object") {
			return null;
		}

		// Validate required fields exist and have correct types
		if (
			typeof room.fullname !== "string" ||
			typeof room.shortname !== "string" ||
			typeof room.number !== "string" ||
			typeof room.name !== "string" ||
			typeof room.address !== "string" ||
			typeof room.lat !== "number" ||
			typeof room.lon !== "number" ||
			typeof room.seats !== "number" ||
			typeof room.type !== "string" ||
			typeof room.furniture !== "string" ||
			typeof room.href !== "string"
		) {
			return null;
		}

		return new Room(
			room.fullname,
			room.shortname,
			room.number,
			room.name,
			room.address,
			room.lat,
			room.lon,
			room.seats,
			room.type,
			room.furniture,
			room.href
		);
	}
}
