// DatasetProcessor.ts
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
import * as parse5 from "parse5";
import { ChildNode, Document } from "parse5/dist/tree-adapters/default";
import { findTableWithClass, getTableCells } from "./HtmlParseHelpers";
import { relative } from "path";

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
			console.log("relativePath: " + relativePath);
			if (relativePath.endsWith("index.htm")) {
				indexFile = file;
			}
		});

		if (!indexFile) {
			throw new InsightError("index file does not exist");
		}

		const indexStringContent = await (indexFile as JSZip.JSZipObject).async("string");

		const indexDoc: Document = parse5.parse(indexStringContent);

		const buildingTable = this.getBuildingTable(indexDoc.childNodes);
		if (!buildingTable) {
			throw new InsightError("building table not found");
		}

		const buildingRows = this.getBuildingRows(buildingTable);
		if (buildingRows.length === 0) {
			throw new InsightError("No building rows found in index.htm");
		}

		// Process each building
		const buildingPromises = buildingRows.map(async (row) => {
			const buildingData = this.getBuildingDataFromRow(row);
			if (!buildingData) {
				console.warn("Skipping invalid building row");
				return [];
			}
			return this.getRoomsForBuilding(buildingData, zipContent);
		});

		// Wait for all building processing to complete
		const roomArrays = await Promise.all(buildingPromises);
		return roomArrays.flat();
	}

	private static async getRoomsForBuilding(buildingData: BuildingData, zipContent: JSZip): Promise<Room[]> {
		const rooms: Room[] = [];

		// Normalize the building file path
		const buildingFilePath = this.normalizeZipPath(buildingData.roomsLink);
		console.log(`Searching for building file: ${buildingFilePath}`);

		// Find the building file in the zip
		const buildingFile = this.findFileInZip(zipContent, buildingFilePath);
		if (!buildingFile) {
			console.warn(`Building file not found: ${buildingFilePath} for building ${buildingData.fullName}`);
			return rooms;
		}

		try {
			// Parse building file content
			const buildingContent = await buildingFile.async("string");
			const buildingDoc: Document = parse5.parse(buildingContent);

			// Find and process rooms table
			const roomsTable = findTableWithClass(buildingDoc, "views-table");
			if (!roomsTable) {
				console.warn(`Rooms table not found in building: ${buildingData.fullName}`);
				return rooms;
			}

			const roomRows = this.getRoomRows(roomsTable);
			for (const roomRow of roomRows) {
				try {
					const cells = getTableCells(roomRow);
					const roomData = this.getRoomDataFromCells(cells, buildingData);
					if (roomData) {
						console.log("ROOM DATA: " + roomData);
						const name = `${buildingData.shortName}_${roomData.number}`;
						const room = new Room(
							buildingData.fullName,
							buildingData.shortName,
							roomData.number,
							name,
							buildingData.address,
							1,
							1,
							roomData.seats,
							roomData.type,
							roomData.furniture,
							roomData.href
						);
						rooms.push(room);
					}
				} catch (e) {
					console.warn(`Error processing room row in ${buildingData.fullName}: ${e}`);
					continue;
				}
			}
		} catch (e) {
			console.error(`Error processing building ${buildingData.fullName}: ${e}`);
		}

		return rooms;
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
		// Remove leading "./" and normalize slashes
		return path.replace(/^\.\//, "").replace(/\\/g, "/").replace(/^\//, ""); // Remove leading slash if present
	}

	private static getRoomRows(roomsTable: ChildNode): ChildNode[] {
		const rows: ChildNode[] = [];
		if ("childNodes" in roomsTable) {
			for (const node of roomsTable.childNodes) {
				if (node.nodeName === "tbody" && "childNodes" in node) {
					for (const child of node.childNodes) {
						if (child.nodeName === "tr") {
							rows.push(child);
						}
					}
				}
			}
		}
		return rows;
	}

	private static getRoomDataFromCells(cells: ChildNode[], buildingData: BuildingData): RoomData | null {
		let number = "",
			seats = 0,
			furniture = "",
			type = "",
			href = "";

		for (const cell of cells) {
			if ("attrs" in cell) {
				const classAttr = cell.attrs?.find((attr) => attr.name === "class")?.value || "";

				if (classAttr.includes("views-field-field-room-number")) {
					number = this.getLinkText(cell);
					href = this.getHrefFromLink(cell);
				} else if (classAttr.includes("views-field-field-room-capacity")) {
					const seatsText = this.getTextContent(cell);
					seats = parseInt(seatsText, 10);
				} else if (classAttr.includes("views-field-field-room-furniture")) {
					furniture = this.getTextContent(cell);
				} else if (classAttr.includes("views-field-field-room-type")) {
					type = this.getTextContent(cell);
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
						shortName = DatasetProcessor.getTextContent(child);
					}

					// Extract the building name
					if (classAttr.includes("views-field-title")) {
						fullName = DatasetProcessor.getLinkText(child); // Updated to handle <a> tag
						roomsLink = DatasetProcessor.getHrefFromLink(child);
					}

					// Extract the building address
					if (classAttr.includes("views-field-field-building-address")) {
						address = DatasetProcessor.getTextContent(child);
					}
				}
			}
		}

		if (fullName && shortName && address) {
			return { fullName, shortName, address, roomsLink };
		}
		return null;
	}

	private static getTextContent(node: ChildNode): string {
		let text = "";

		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				if (child.nodeName === "#text" && "value" in child) {
					text += child.value.trim() + " ";
				}
			}
		}
		return text.trim();
	}

	private static getHrefFromLink(node: ChildNode): string {
		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				if (child.nodeName === "a" && child.attrs) {
					const href = child.attrs.find((attr) => attr.name === "href")?.value;
					if (href) {
						return href;
					}
				}
			}
		}
		return "";
	}

	private static getLinkText(node: ChildNode): string {
		let text = "";

		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				if (child.nodeName === "a" && "childNodes" in child) {
					for (const linkChild of child.childNodes) {
						if (linkChild.nodeName === "#text" && "value" in linkChild) {
							text += linkChild.value.trim() + " ";
						}
					}
				}
			}
		}

		return text.trim();
	}

	private static getLinksAndImages(node: ChildNode): any[] {
		const elements: any[] = [];

		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				if (child.nodeName === "a" && child.attrs) {
					const href = child.attrs.find((attr) => attr.name === "href")?.value;
					if (href) {
						elements.push({ type: "link", href });
					}
				} else if (child.nodeName === "img" && child.attrs) {
					const src = child.attrs.find((attr) => attr.name === "src")?.value;
					const alt = child.attrs.find((attr) => attr.name === "alt")?.value || "";
					elements.push({ type: "image", src, alt });
				}
			}
		}

		return elements;
	}

	private static getBuildingTable(nodes: ChildNode[]): ChildNode | null {
		for (const node of nodes) {
			// Check if the node has children
			if ("childNodes" in node) {
				if (node.nodeName === "table") {
					return node;
				}
				// Search children recursively
				const result = this.getBuildingTable(node.childNodes);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	private static getBuildingRows(buildingTable: ChildNode): ChildNode[] {
		const rows: ChildNode[] = [];
		if ("childNodes" in buildingTable) {
			for (const node of buildingTable.childNodes) {
				if (node.nodeName === "tbody" && "childNodes" in node) {
					for (const child of node.childNodes) {
						if (child.nodeName === "tr") {
							const cells = getTableCells(child);
							if (cells.some((cell: ChildNode) => this.isBuildingRow(cell))) {
								rows.push(child);
							}
						}
					}
				}
			}
		}
		return rows;
	}

	private static isBuildingRow(cell: ChildNode): boolean {
		if ("attrs" in cell) {
			for (const attr of cell.attrs) {
				if (attr.name === "class" && attr.value.includes("views-field-field-building-code")) {
					return true;
				}
			}
		}
		return false;
	}
}
