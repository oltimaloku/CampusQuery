// DatasetProcessor.ts
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
import * as parse5 from "parse5";
import { ChildNode, Document } from "parse5/dist/tree-adapters/default";

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
		const promises: Promise<void>[] = [];

		// First get and parse the index.htm file
		let indexFile: JSZip.JSZipObject | null = null;
		zipContent.forEach((relativePath: string, file: JSZip.JSZipObject) => {
			console.log("relativePath: " + relativePath);
			if (relativePath.endsWith("/index.htm")) {
				indexFile = file;
			}
		});

		if (!indexFile) {
			return rooms;
		}

		const indexStringContent = await (indexFile as JSZip.JSZipObject).async("string");

		const indexDoc: Document = parse5.parse(indexStringContent);

		//console.log("indexDoc HTML:", parse5.serialize(indexDoc));

		const buildingTable = this.findBuildingTable(indexDoc.childNodes);
		if (!buildingTable) {
			return rooms;
		}
		console.log("buildingTable HTML:", buildingTable);
		return rooms;
	}

	private static findBuildingTable(nodes: ChildNode[]): ChildNode | null {
		for (const node of nodes) {
			// Check if the node has children
			if ("childNodes" in node) {
				if (
					node.nodeName === "table" &&
					node.attrs?.some((attr) => attr.name === "class" && attr.value === "views-table cols-8")
				) {
					return node;
				}
				// Search children
				const result = this.findBuildingTable(node.childNodes);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}
}
