import JSZip from "jszip";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import Section from "./Section";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Section[]> = new Map<string, Section[]>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			if (!this.isValidId(id)) {
				throw new InsightError("Invalid id");
			}

			if (this.datasets.has(id)) {
				throw new InsightError("Dataset already exists");
			}

			if (kind === InsightDatasetKind.Sections) {
				const processedContent = await this.processContent(content);

				if (processedContent.length === 0) {
					throw new InsightError("No valid sections found");
				}

				this.datasets.set(id, processedContent);
			} else {
				throw new Error("Rooms dataset has not been implemented yet");
			}

			return Array.from(this.datasets.keys());
		} catch (error) {
			throw new InsightError("Error adding dataset" + error);
		}
	}

	private isValidId(id: string): boolean {
		return /^[^_]+$/.test(id) && id.trim().length > 0;
	}

	private async processContent(content: string): Promise<Section[]> {
		try {
			// https://betterstack.com/community/questions/how-to-do-base64-encoding-in-node-js/
			const buf = Buffer.from(content, "base64");
			// https://stuk.github.io/jszip/documentation/howto/read_zip.html
			const zip = new JSZip();

			const zipContent: JSZip = await zip.loadAsync(buf); // Load zip data

			const sections = await this.createValidSectionsFromZip(zipContent);

			if (sections.length === 0) {
				throw new InsightError("No valid sections found");
			}

			return sections;
		} catch (e) {
			throw new InsightError("Error processing content: " + e);
		}
	}

	private async createValidSectionsFromZip(zipContent: JSZip): Promise<Section[]> {
		const sections: Section[] = [];
		const promises: Promise<void>[] = [];

		// https://stuk.github.io/jszip/documentation/api_jszip/for_each.html
		zipContent.forEach((relativePath: string, file: any) => {
			// https://stuk.github.io/jszip/documentation/api_zipobject/async.html
			const promise = file.async("string").then((fileContent: string) => {
				if (fileContent.trim().length === 0) {
					return;
				}
				if (relativePath.startsWith("courses/")) {
					for (const course of JSON.parse(fileContent).result) {
						const section = Section.createSection(course);

						if (section) {
							sections.push(section);
						}
					}
				}
			});

			promises.push(promise);
		});

		await Promise.all(promises);
		return sections;
	}

	public async removeDataset(id: string): Promise<string> {
		if (!this.isValidId(id)) {
			throw new InsightError("Invalid id");
		}

		// delete returns true if the key was found and deleted, false otherwise
		if (this.datasets.delete(id)) {
			return id;
		} else {
			throw new NotFoundError("Dataset not found");
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		let datasets: InsightDataset[] = [];

		for (const [id, sections] of this.datasets) {
			const dataset: InsightDataset = {
				id: id,
				kind: InsightDatasetKind.Sections,
				numRows: sections.length,
			};
			datasets.push(dataset);
		}

		return datasets;
	}
}
