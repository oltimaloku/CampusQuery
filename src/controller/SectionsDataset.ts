import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import Section from "./Section";
const JSZip = require("jszip");

export default class SectionsDataset implements InsightDataset {
	public id: string;
	// kind will be determined on construction by addDataset
	public kind: InsightDatasetKind = InsightDatasetKind.Sections;
	public numRows = 0;
	public sections: Section[] = [];

	public constructor(id: string, content: string) {
		this.id = id;
		// TODO: add logic to parse content into array of sections
	}

	public async processContent(content: string): Promise<void> {
		// https://betterstack.com/community/questions/how-to-do-base64-encoding-in-node-js/
		const buf = Buffer.from(content, "base64");
		// https://stuk.github.io/jszip/documentation/howto/read_zip.html
		const zip = new JSZip();

		const zipContent = await zip.loadAsync(buf); // Load zip data

		// https://stuk.github.io/jszip/documentation/api_jszip/for_each.html
		zipContent.forEach(async (relativePath: string, file: any) => {
			// https://stuk.github.io/jszip/documentation/api_zipobject/async.html
			const fileContent = await file.async("string");
			if (relativePath.startsWith("courses/")) {
				console.log(fileContent);
			}
		});
		// TODO: throw error if no valid sections found
	}
}
