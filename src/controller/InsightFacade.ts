import { on } from "events";
import JSZip from "jszip";
import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
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
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}

	// Recursive check if it is a filter
	public isFilter(obj: unknown, colVals: string[]): Boolean {
		if (typeof obj === "object" && obj !== null) {
			//console.log(Object.keys(obj));
			if (Object.keys(obj).length !== 1) {
				return false;
			}
			// Validate NOT
			if ("NOT" in obj) {
				return this.isFilter(obj.NOT, colVals);
			}

			// Validate AND and OR the same way
			if ("AND" in obj || "OR" in obj) {
				// Check if the value is an array
				if (Object.values(obj).length === 1) {
					const val = Object.values(obj)[0];
					if (Array.isArray(val)) {
						// Check that no object is not a filter
						return !val.some((item) => {
							return !this.isFilter(item, colVals);
						});
					}
				}
				return false;
			}
		}
		return true;
	}

	public validateCols(cols: unknown, mfields: string[], sfields: string[]): string[] {
		let onlyID: string;
		const keySections = 2;
		if (Array.isArray(cols)) {
			if ((cols.length === 0) || (typeof cols[0] !== "string")) {
				throw new Error('Incorrect format');
			}
			onlyID = cols[0].split("_")[0];
			for (const val of cols) {
				if (typeof val === "string") {
					//console.log(val);
					if (val.split("_", keySections)[0] !== onlyID) {
						throw new Error('More than one id');
					}
					if (val.split("_", keySections).length < keySections) {
						throw new Error('No cols after underscore');
					}
					if (
						!mfields.includes(val.split("_", keySections)[1]) &&
						!sfields.includes(val.split("_", keySections)[1])
					) {
						throw new Error('Not a key');
					}
				} else {
					throw new Error('Not a string');
				}
			}
			return cols;
		} else {
			throw new Error('Incorrect col format');
		}
	}

	// Check for {}
	public isEmpty(obj: unknown): Boolean {
		if (typeof obj === "object" && obj !== null) {
			return Object.keys(obj).length === 0;
		}
		return false;
	}

	public validateOrder(order: unknown, colVals: string[]): Boolean {
		if (typeof order === "string") {
			if (colVals.includes(order)) {
				return true;
			}
		}
		return false;
	}

	public validateWhere(where: unknown, colVals: string[]): Boolean {
		if (!this.isEmpty(where) && !this.isFilter(where, colVals)) {
			return false;
		}
		return true;
	}

	public validateQuery(query: unknown): Boolean {
		const mfields: string[] = ["avg", "pass", "fail", "audit", "year"];
		const sfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
		let where: unknown = {};
		let options: unknown = {};
		// Check query has body and options
		if (typeof query === "object" && query && "WHERE" in query && "OPTIONS" in query) {
			where = query.WHERE;
			options = query.OPTIONS;
		} else {
			return false;
		}
		// Validate options
		// TODO: check order
		let colVals: string[];
		if (typeof options === "object" && options !== null) {
			if ("COLUMNS" in options) {
				const cols = options.COLUMNS;
				try {
					colVals = this.validateCols(cols, mfields, sfields);
				} catch {
					return false;
				}
			} else {
				return false;
			}
			if ("ORDER" in options) {
				const order: unknown = options.ORDER;
				if (!this.validateOrder(order, colVals)) {
					return false;
				};
			}
		} else {
			return false;
		}
		// Validate where
		return this.validateWhere(where, colVals);
	}
}
