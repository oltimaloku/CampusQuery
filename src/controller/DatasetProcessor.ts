// DatasetProcessor.ts
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";

export default class DatasetProcessor {
	public static async processContent(content: string): Promise<Section[]> {
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
}
