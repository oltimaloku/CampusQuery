import JSZip from "jszip";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import Section from "./Section";
import { validateQuery, validateCols, isEmpty, OptionResult } from "./ValidationHelpers";

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

		const isDeleted = this.datasets.delete(id);

		// delete returns true if the key was found and deleted, false otherwise
		if (isDeleted) {
			return id;
		} else {
			throw new NotFoundError("Dataset not found");
		}
	}

	public getOptions(options: unknown, mfields: string[], sfields: string[]): OptionResult {
		let onlyID = "";
		let orderField = "";
		let colVals: string[] = [];
		if (typeof options === "object" && options !== null) {
			if ("COLUMNS" in options) {
				const cols = options.COLUMNS;
				try {
					colVals = validateCols(cols, mfields, sfields);
					onlyID = colVals[0].split("_")[0];
				} catch {
					throw new InsightError(`No cols`);
				}
			}
			if ("ORDER" in options) {
				const order: unknown = options.ORDER;
				if (typeof order === "string") {
					if (colVals.includes(order)) {
						orderField = order.split("_")[1];
					} else {
						throw new InsightError(`Invalid order field`);
					}
				} else {
					throw new InsightError(`Order field not a string`);
				}
			}
		}
		return { onlyID: onlyID, colVals: colVals, orderField: orderField };
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		const mfields: string[] = ["avg", "pass", "fail", "audit", "year"];
		const sfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
		const maxLen = 5000;
		let where: unknown;
		let options: unknown;
		if (!validateQuery(query)) {
			throw new InsightError(`Invalid format for query`);
		}
		if (typeof query === "object" && query && "WHERE" in query && "OPTIONS" in query) {
			where = query.WHERE;
			options = query.OPTIONS;
		}
		const optionsData: OptionResult = this.getOptions(options, mfields, sfields);
		const sections: Section[] | undefined = this.datasets.get(optionsData.onlyID);
		let results: Section[] = [];
		if (typeof sections !== "undefined") {
			results = this.runFilter(where, optionsData.onlyID, sections);
		}
		if (results.length > maxLen) {
			throw new ResultTooLargeError("Result too large");
		}
		const orderField: string = optionsData.orderField;
		if (orderField !== "") {
			results.sort((a, b) => a[orderField as keyof Section] - b[orderField as keyof Section]);
		}
		const retVal: InsightResult[] = results.map((section) => {
			const result: InsightResult = {};
			for (const colKey of optionsData.colVals) {
				result[colKey] = section[colKey.split("_")[1] as keyof Section];
			}
			return result;
		});
		return retVal;
	}

	public runFilter(obj: unknown, onlyID: string, current: Section[]): Section[] {
		if (typeof obj === "object" && obj !== null) {
			if ("NOT" in obj) {
				const inverse: Section[] = this.runFilter(obj.NOT, onlyID, current);
				return current.filter((section) => !inverse.includes(section));
			}
			if ("AND" in obj) {
				if (Array.isArray(obj.AND)) {
					const and: unknown[] = obj.AND;
					for (const query of and) {
						current = this.runFilter(query, onlyID, current);
					}
					return current;
				}
			}
			if ("OR" in obj) {
				if (Array.isArray(obj.OR)) {
					const or: unknown[] = obj.OR;
					let builtArray: Section[] = [];
					for (const query of or) {
						builtArray = builtArray.concat(
							this.runFilter(query, onlyID, current).filter((section) => !builtArray.includes(section))
						);
					}
					return builtArray;
				}
			}
			if (isEmpty(obj)) {
				return current;
			}
			return this.runSMFilter(obj, current);
		}
		return [];
	}

	public mComparisons(comp: string, val: number, mval: number): boolean {
		switch (comp) {
			case "LT":
				return val < mval;
			case "EQ":
				return val === mval;
			case "GT":
				return val > mval;
		}
		throw new InsightError(`Invalid mcomp comparator`);
	}

	public runMFilter(obj: unknown, current: Section[]): Section[] {
		if (typeof obj === "object" && obj !== null) {
			let mcomp: unknown = null;
			let comp = "";
			if ("LT" in obj) {
				mcomp = obj.LT;
				comp = "LT";
			}
			if ("GT" in obj) {
				mcomp = obj.GT;
				comp = "GT";
			}
			if ("EQ" in obj) {
				mcomp = obj.EQ;
				comp = "EQ";
			}
			if (typeof mcomp === "object" && mcomp !== null) {
				const mkey = Object.keys(mcomp)[0].split("_")[1];
				const mval = Object.values(mcomp)[0];
				try {
					return current.filter((section) => this.mComparisons(comp, section[mkey as keyof Section], mval));
				} catch {
					throw new InsightError("mkey not found");
				}
			}
		}
		return [];
	}

	public runSMFilter(obj: unknown, current: Section[]): Section[] {
		if (typeof obj === "object" && obj !== null) {
			if ("IS" in obj) {
				const scomp: unknown = obj.IS;
				if (typeof scomp === "object" && scomp !== null) {
					const skey = Object.keys(scomp)[0].split("_")[1];
					let sval = Object.values(scomp)[0];
					try {
						sval = "^" + sval.replace(/\*/gi, ".*") + "$";
						const regex = new RegExp(sval);
						return current.filter((section) => {
							return regex.test(section[skey as keyof Section]);
						});
					} catch {
						throw new InsightError("skey not found");
					}
				}
			}
			return this.runMFilter(obj, current);
		}
		return [];
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasets: InsightDataset[] = [];

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
