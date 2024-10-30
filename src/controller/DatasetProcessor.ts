// DatasetProcessor.ts
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
import * as parse5 from "parse5";
import { ChildNode, Document } from "parse5/dist/tree-adapters/default";
import {
	findTableWithClass,
	getBuildingRows,
	getBuildingTable,
	getHrefFromLink,
	getLinkText,
	getRoomRows,
	getTableCells,
	getTextContent,
} from "./HtmlParseHelpers";
import GeolocationService from "./GeolocationService";

interface BuildingData {
	fullName: string;
	shortName: string;
	address: string;
	roomsLink: string;
	lat?: number;
	lon?: number;
}

interface RoomData {
	number: string;
	seats: number;
	furniture: string;
	type: string;
	href: string;
}

export default class DatasetProcessor {
	public static async processSectionsContent(content: string): Promise<Section[]> {
		try {
			const buf = Buffer.from(content, "base64");
			const zip = new JSZip();
			const zipContent = await zip.loadAsync(buf);
			const sections = await this.createValidSectionsFromZip(zipContent);
			if (sections.length === 0) {
				throw new InsightError("No valid sections found");
			}
			return sections;
		} catch (e) {
			throw new InsightError("Error processing content: " + e);
		}
	}

	private static async createValidSectionsFromZip(zipContent: JSZip): Promise<Section[]> {
		const sections: Section[] = [];
		const promises: Promise<void>[] = [];

		zipContent.forEach((relativePath: string, file: JSZip.JSZipObject) => {
			if (!relativePath.startsWith("courses/") || file.dir) {
				return;
			}
			const promise = file.async("string").then((fileContent: string) => {
				if (fileContent.trim().length === 0) {
					return;
				}
				try {
					const json = JSON.parse(fileContent);
					if (json && Array.isArray(json.result)) {
						for (const course of json.result) {
							const section = Section.createSection(course);
							if (section) {
								sections.push(section);
							}
						}
					}
				} catch {
					// Ignore invalid JSON files
				}
			});
			promises.push(promise);
		});

		await Promise.all(promises);
		return sections;
	}

	public static async processRoomsContent(content: string): Promise<Room[]> {
		try {
			const buf = Buffer.from(content, "base64");
			const zip = new JSZip();
			const zipContent = await zip.loadAsync(buf);
			const rooms = await this.createValidRoomsFromZip(zipContent);
			if (rooms.length === 0) {
				throw new InsightError("No valid rooms found");
			}
			return rooms;
		} catch (e) {
			throw new InsightError("Error processing content: " + e);
		}
	}

	private static async createValidRoomsFromZip(zipContent: JSZip): Promise<Room[]> {
		let indexFile: JSZip.JSZipObject | null = null;
		zipContent.forEach((relativePath: string, file: JSZip.JSZipObject) => {
			if (relativePath.endsWith("index.htm")) {
				indexFile = file;
			}
		});

		if (!indexFile) {
			throw new InsightError("index file does not exist");
		}

		const indexStringContent = await (indexFile as JSZip.JSZipObject).async("string");

		const indexDoc: Document = parse5.parse(indexStringContent);

		const buildingTable = getBuildingTable(indexDoc.childNodes);
		if (!buildingTable) {
			throw new InsightError("building table not found");
		}

		const buildingRows = getBuildingRows(buildingTable);
		if (buildingRows.length === 0) {
			throw new InsightError("No building rows found in index.htm");
		}

		const buildingPromises = buildingRows.map(async (row) => {
			const buildingData = this.getBuildingDataFromRow(row);
			if (!buildingData) {
				return [];
			}
			return this.getRoomsForBuilding(buildingData, zipContent);
		});

		const roomArrays = await Promise.all(buildingPromises);
		return roomArrays.flat();
	}

	private static async getRoomsForBuilding(buildingData: BuildingData, zipContent: JSZip): Promise<Room[]> {
		const buildingFile = this.findBuildingFile(zipContent, buildingData.roomsLink);
		if (!buildingFile) {
			return [];
		}

		const buildingDoc = await this.parseBuildingFile(buildingFile);
		const roomsTable = findTableWithClass(buildingDoc, "views-table");
		if (!roomsTable) {
			return [];
		}

		const roomRows = getRoomRows(roomsTable);
		return this.extractRoomsFromRows(roomRows, buildingData);
	}

	private static findBuildingFile(zipContent: JSZip, link: string): JSZip.JSZipObject | null {
		const path = this.normalizeZipPath(link);
		return this.findFileInZip(zipContent, path);
	}

	private static async parseBuildingFile(buildingFile: JSZip.JSZipObject): Promise<Document> {
		const content = await buildingFile.async("string");
		return parse5.parse(content);
	}

	private static async extractRoomsFromRows(roomRows: ChildNode[], buildingData: BuildingData): Promise<Room[]> {
		// Create an array of promises to process rooms in parallel
		const roomPromises = roomRows.map(async (row) => {
			try {
				const cells = getTableCells(row);
				const roomData = this.getRoomDataFromCells(cells);
				if (roomData) {
					const name = `${buildingData.shortName}_${roomData.number}`;

					// Fetch geolocation data for the building address
					const geoResponse = await GeolocationService.getGeolocation(buildingData.address);

					if (geoResponse.error) {
						throw new InsightError(`No location found for ${name}`);
					}

					// Return the created Room instance
					return new Room(
						buildingData.fullName,
						buildingData.shortName,
						roomData.number,
						name,
						buildingData.address,
						geoResponse.lat!,
						geoResponse.lon!,
						roomData.seats,
						roomData.type,
						roomData.furniture,
						roomData.href
					);
				}
			} catch {
				return null; // Skip invalid rows
			}
		});

		// Wait for all room promises to complete and filter out any null results
		const rooms = await Promise.all(roomPromises);
		return rooms.filter((room): room is Room => room !== null);
	}

	private static findFileInZip(zipContent: JSZip, targetPath: string): JSZip.JSZipObject | null {
		let foundFile: JSZip.JSZipObject | null = null;
		const normalizedTarget = this.normalizeZipPath(targetPath);

		zipContent.forEach((relativePath: string, file: JSZip.JSZipObject) => {
			const normalizedPath = this.normalizeZipPath(relativePath);

			if (normalizedPath.endsWith(normalizedTarget)) {
				foundFile = file;
			}
		});

		return foundFile;
	}

	private static normalizeZipPath(path: string): string {
		path = path.replace(/^\.\//, "").replace(/\\/g, "/");
		return path.replace(/^\//, "");
	}

	private static getRoomDataFromCells(cells: ChildNode[]): RoomData | null {
		let number = "",
			seats = 0,
			furniture = "",
			type = "",
			href = "";

		for (const cell of cells) {
			if ("attrs" in cell) {
				const classAttr = cell.attrs?.find((attr) => attr.name === "class")?.value || "";

				if (classAttr.includes("views-field-field-room-number")) {
					number = getLinkText(cell);
					href = getHrefFromLink(cell);
				} else if (classAttr.includes("views-field-field-room-capacity")) {
					const seatsText = getTextContent(cell);
					seats = parseInt(seatsText, 10);
				} else if (classAttr.includes("views-field-field-room-furniture")) {
					furniture = getTextContent(cell);
				} else if (classAttr.includes("views-field-field-room-type")) {
					type = getTextContent(cell);
				}
			}
		}

		if (number && seats && furniture && type) {
			return {
				number,
				seats,
				furniture,
				type,
				href,
			};
		}
		return null;
	}

	private static getBuildingDataFromRow(buildingRow: ChildNode): BuildingData | null {
		let fullName = "",
			shortName = "",
			address = "",
			roomsLink = "";

		if ("childNodes" in buildingRow) {
			for (const child of buildingRow.childNodes) {
				if (child.nodeName === "td" && child.attrs) {
					const classAttr = child.attrs.find((attr) => attr.name === "class")?.value || "";

					// Extract the building code
					if (classAttr.includes("views-field-field-building-code")) {
						shortName = getTextContent(child);
					}

					// Extract the building name
					if (classAttr.includes("views-field-title")) {
						fullName = getLinkText(child); // Updated to handle <a> tag
						roomsLink = getHrefFromLink(child);
					}

					// Extract the building address
					if (classAttr.includes("views-field-field-building-address")) {
						address = getTextContent(child);
					}
				}
			}
		}

		if (fullName && shortName && address) {
			return { fullName, shortName, address, roomsLink };
		}
		return null;
	}
}
