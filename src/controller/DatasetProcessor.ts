// DatasetProcessor.ts
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
import * as parse5 from "parse5";
import { ChildNode, Document } from "parse5/dist/tree-adapters/default";
import { findTableWithClass, getTableCells } from "./HtmlParseHelpers";

interface BuildingData {
	title: string;
	code: string;
	address: string;
}

interface RoomData {
	number: string;
	seats: number;
	furniture: string;
	type: string;
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
		const rooms: Room[] = [];

		// First get and parse the index.htm file
		let indexFile: JSZip.JSZipObject | null = null;
		zipContent.forEach((relativePath: string, file: JSZip.JSZipObject) => {
			if (relativePath.endsWith("/index.htm")) {
				indexFile = file;
			}
		});

		if (!indexFile) {
			return rooms;
		}

		const indexStringContent = await (indexFile as JSZip.JSZipObject).async("string");

		const indexDoc: Document = parse5.parse(indexStringContent);

		const buildingTable = this.getBuildingTable(indexDoc.childNodes);
		if (!buildingTable) {
			return rooms;
		}

		const buildingRows = this.getBuildingRows(buildingTable);
		if (buildingRows.length === 0) {
			return rooms;
		}

		for (const buildingRow of buildingRows) {
			const buildingData = this.getBuildingDataFromRow(buildingRow);
			if (!buildingData) {
				console.log("Invalid building data");
			} else {
				console.log("buildingData: \n", buildingData);
			}
		}
		return rooms;
	}

	private static getBuildingDataFromRow(buildingRow: ChildNode): BuildingData | null {
		let title = "",
			code = "",
			address = "";

		if ("childNodes" in buildingRow) {
			for (const child of buildingRow.childNodes) {
				if (child.nodeName === "td" && child.attrs) {
					const classAttr = child.attrs.find((attr) => attr.name === "class")?.value || "";

					// Extract the building code
					if (classAttr.includes("views-field-field-building-code")) {
						code = DatasetProcessor.getTextContent(child);
					}

					// Extract the building name
					if (classAttr.includes("views-field-title")) {
						title = DatasetProcessor.getLinkText(child); // Updated to handle <a> tag
					}

					// Extract the building address
					if (classAttr.includes("views-field-field-building-address")) {
						address = DatasetProcessor.getTextContent(child);
					}
				}
			}
		}
		console.log("title: ", title, "code: ", code, "address: ", address);
		if (title && code && address) {
			return { title, code, address };
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

	private static getLinkText(node: ChildNode): string {
		let text = "";

		if ("childNodes" in node) {
			for (const child of node.childNodes) {
				if (child.nodeName === "a" && "childNodes" in child) {
					// Traverse the <a> tag's children to get the text content
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
				// Search children
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
