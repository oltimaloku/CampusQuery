import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import Section from "./Section";

export default class SectionsDataset implements InsightDataset {
	public id: string;
	// kind will be determined on construction by addDataset
	public kind: InsightDatasetKind = InsightDatasetKind.Sections;
	public numRows: number;
	public sections: Section[] = [];

	public constructor(id: string, content: string) {
		this.id = id;
		// TODO: add logic to parse content into array of sections
	}
}
