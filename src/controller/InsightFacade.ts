import fs from "fs-extra";
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
import {
	validateQuery,
	validateCols,
	isEmpty,
	OptionResult,
	MFIELDS,
	SFIELDS,
	OrderObject,
	TransformInterface,
	validateTransformations,
} from "./ValidationHelpers";
import DatasetProcessor from "./DatasetProcessor";
import Room from "./Room";
import Decimal from "decimal.js";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Section[] | Room[]> = new Map<string, Section[] | Room[]>();
	private static readonly MFIELDS = MFIELDS;
	private static readonly SFIELDS = SFIELDS;
	private static readonly MAX_RESULTS = 5000;

	public async getDataset(id: string): Promise<Section[] | Room[]> {
		if (this.datasets.has(id)) {
			const dataObject = this.datasets.get(id);
			if (typeof dataObject !== "undefined") {
				return dataObject;
			}
		}
		try {
			const retVal: any = await fs.readJSON(`${__dirname}/../../data/${id}.json`);
			if (Array.isArray(retVal)) {
				if (retVal.length > 0 && retVal[0] instanceof Object) {
					this.datasets.set(id, retVal);
					return retVal;
				}
			}
			throw new NotFoundError(`Invalid file format`);
		} catch (_error) {
			throw new NotFoundError(`file not found`);
		}
		return [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			if (!this.isValidId(id)) {
				throw new InsightError("Invalid id");
			}
			try {
				await fs.mkdir(`${__dirname}/../../data`);
			} catch (error: any) {
				if (!(error.code === "EEXIST")) {
					throw error;
				}
			}

			const alreadyExists: String[] = await fs.readdir(`${__dirname}/../../data`);
			if (this.datasets.has(id) || alreadyExists.includes(`${id}.json`)) {
				throw new InsightError("Dataset already exists");
			}

			let processedContent: Section[] | Room[];
			if (kind === InsightDatasetKind.Sections) {
				processedContent = await DatasetProcessor.processSectionsContent(content);
			} else if (kind === InsightDatasetKind.Rooms) {
				processedContent = await DatasetProcessor.processRoomsContent(content);
			} else {
				throw new InsightError("Unsupported dataset kind");
			}

			if (processedContent.length === 0) {
				throw new InsightError("No valid data found in dataset");
			}

			this.datasets.set(id, processedContent);
			await fs.writeJSON(`${__dirname}/../../data/${id}.json`, processedContent);
			return Array.from(this.datasets.keys());
		} catch (error) {
			throw new InsightError("Error adding dataset" + error);
		}
	}

	private isValidId(id: string): boolean {
		return /^[^_]+$/.test(id) && id.trim().length > 0;
	}

	public async removeDataset(id: string): Promise<string> {
		if (!this.isValidId(id)) {
			throw new InsightError("Invalid id");
		}

		const existsInData = await fs.pathExists(`${__dirname}/../../data/${id}.json`);
		const existsInMemory = this.datasets.has(id);
		if (!existsInData && !existsInMemory) {
			throw new NotFoundError("Dataset not found");
		}

		if (existsInMemory) {
			this.datasets.delete(id);
		}

		if (existsInData) {
			await fs.remove(`${__dirname}/../../data/${id}.json`);
		}

		return id;
	}

	public getOptions(options: unknown, mfields: string[], sfields: string[], applyKeys: string[]): OptionResult {
		let onlyID = "";
		let orderField: string | OrderObject = "";
		let colVals: string[] = [];
		if (typeof options === "object" && options !== null) {
			if ("COLUMNS" in options) {
				const cols = options.COLUMNS;
				try {
					colVals = validateCols(cols, mfields, sfields, applyKeys);
					if (colVals[0].includes("_")) {
						onlyID = colVals[0].split("_")[0];
					} else {
						onlyID = "";
					}
				} catch {
					throw new InsightError(`No cols`);
				}
			}
			if ("ORDER" in options) {
				const order: unknown = options.ORDER;
				if (typeof order === "string") {
					if (colVals.includes(order)) {
						orderField = order;
					} else {
						throw new InsightError(`Invalid order field`);
					}
				} else if (typeof order === "object" && order && "dir" in order && "keys" in order) {
					if (
						typeof order.dir === "string" &&
						Array.isArray(order.keys) &&
						order.keys.every((it) => typeof it === "string")
					) {
						orderField = order as OrderObject;
					}
				} else {
					throw new InsightError(`Order field not a string`);
				}
			}
		}
		return { onlyID: onlyID, colVals: colVals, orderField: orderField };
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			let where: unknown;
			let options: unknown;
			let transformation: TransformInterface | null = null;

			if (!validateQuery(query)) {
				throw new InsightError(`Invalid format for query`);
			}

			if (typeof query === "object" && query && "WHERE" in query && "OPTIONS" in query) {
				where = query.WHERE;
				options = query.OPTIONS;
			}

			let applyKeys: string[] = [];

			if (typeof query === "object" && query && "TRANSFORMATIONS" in query) {
				const transformations: unknown = query.TRANSFORMATIONS;
				applyKeys = validateTransformations(transformations, MFIELDS, SFIELDS);
				if (
					typeof transformations === "object" &&
					transformations &&
					"GROUP" in transformations &&
					"APPLY" in transformations
				) {
					const group: unknown = transformations.GROUP;
					if (
						Array.isArray(group) &&
						group.every((item) => typeof item === "string") &&
						Array.isArray(transformations.APPLY)
					) {
						transformation = { group: group, apply: transformations.APPLY };
					}
				}
			}

			const optionsData: OptionResult = this.getOptions(
				options,
				InsightFacade.MFIELDS,
				InsightFacade.SFIELDS,
				applyKeys
			);

			if (transformation) {
				optionsData.onlyID = transformation.group[0].split("_")[0];
			}
			const sections = await this.getDataset(optionsData.onlyID);
			let results: (Section | Room)[] = [];

			if (typeof sections !== "undefined") {
				results = this.runFilter(where, optionsData.onlyID, sections);
			}

			if (results.length > InsightFacade.MAX_RESULTS) {
				throw new ResultTooLargeError("Result too large");
			}

			let output: InsightResult[];
			if (transformation) {
				output = this.applyRecords(
					this.groupRecords(results, transformation.group),
					optionsData.colVals,
					transformation.apply
				);
			} else {
				output = this.mapResults(results, optionsData.colVals);
			}

			if (typeof optionsData.orderField === "string") {
				const orderField: string = optionsData.orderField;
				if (orderField !== "") {
					return this.sortField(output, [orderField], true);
				}
			} else {
				return this.sortField(output, optionsData.orderField.keys, optionsData.orderField.dir === "UP");
			}

			return output;
		} catch (error) {
			// NotFoundError from getDataset must be caught and converted to InsightError
			// since performQuery only returns InsightError or ResultTooLargeError
			if (error instanceof NotFoundError) {
				throw new InsightError("Error performing query: " + error);
			}
			throw error;
		}
	}

	private sortField(results: InsightResult[], fields: string[], ascending: boolean) {
		return results.sort((a, b) => {
			for (const field of fields) {
				const valueA = a[field];
				const valueB = b[field];
				let comparison = 0;

				if (typeof valueA === "number" && typeof valueB === "number") {
					comparison = valueA - valueB;
				} else if (typeof valueA === "string" && typeof valueB === "string") {
					comparison = valueA.localeCompare(valueB);
				}

				// If comparison result is non-zero, apply sorting order and return
				if (comparison !== 0) {
					return ascending ? comparison : -comparison;
				}
			}
			return 0; // if all fields are equal
		});
	}

	private applyRecords(grouped: (Section | Room)[][], colVals: string[], applyRules: unknown[]): InsightResult[] {
		return grouped.map((grp: (Section | Room)[]) => {
			const result: InsightResult = {};
			const rules = new Map<string, string | number>();
			for (const rule of applyRules) {
				if (typeof rule === "object" && rule) {
					rules.set(Object.keys(rule)[0], this.applyRule(grp, Object.values(rule)[0]));
				}
			}
			for (const colKey of colVals) {
				if (colKey.split("_").length > 1) {
					const field = colKey.split("_")[1] as keyof (Section | Room);
					result[colKey] = grp[0][field];
				} else {
					const colVal = rules.get(colKey);
					if (colVal !== undefined) {
						result[colKey] = colVal;
					} else {
						throw new InsightError("Not a valid rule");
					}
				}
			}

			return result;
		});
	}

	private applyRule(grp: (Section | Room)[], rule: unknown): string | number {
		if (rule && typeof rule === "object") {
			let func: string;
			if ("MAX" in rule) {
				if (typeof rule.MAX === "string") {
					func = rule.MAX;
					if (MFIELDS.includes(func.split("_")[1])) {
						return Math.max(...grp.map((item) => item[func.split("_")[1] as keyof (Section | Room)]));
					}
				}
			} else if ("MIN" in rule) {
				if (typeof rule.MIN === "string") {
					func = rule.MIN;
					if (MFIELDS.includes(func.split("_")[1])) {
						return Math.min(...grp.map((item) => item[func.split("_")[1] as keyof (Section | Room)]));
					}
				}
			} else if ("AVG" in rule) {
				if (typeof rule.AVG === "string") {
					func = rule.AVG;
					if (MFIELDS.includes(func.split("_")[1])) {
						return this.calcAverage(func.split("_")[1], grp);
					}
				}
			}
		}
		return 0;
	}

	private calcAverage(func: string, grp: (Room | Section)[]): number {
		let total = new Decimal(0)
		for (const item of grp) {
			total = Decimal.add(total, new Decimal(item[func as keyof (Section | Room)]));
		}
		let avg = total.toNumber() / grp.length;
		return Number(avg.toFixed(2));
	}

	private groupRecords(results: (Section | Room)[], fields: string[]): (Section | Room)[][] {
		const groups: (Section | Room)[][] = [];
		const groupMap: Record<string, (Section | Room)[]> = {};

		results.forEach((record) => {
			// Create a unique key based on the specified fields
			const key = fields
				.map((field) => {
					if (record instanceof Section) {
						return record[field.split("_")[1] as keyof Section];
					} else {
						return record[field.split("_")[1] as keyof Room];
					}
				})
				.join("|");

			// Initialize the group if it doesn't exist
			if (!groupMap[key]) {
				groupMap[key] = [];
				groups.push(groupMap[key]); // Add the new group to the output array
			}

			// Add the record to the group
			groupMap[key].push(record);
		});

		return groups;
	}

	private mapResults(results: (Section | Room)[], colVals: string[]): InsightResult[] {
		return results.map((section: Room | Section) => {
			const result: InsightResult = {};
			for (const colKey of colVals) {
				const field = colKey.split("_")[1] as keyof (Section | Room);
				result[colKey] = section[field];
			}
			return result;
		});
	}

	public runFilter(obj: unknown, onlyID: string, current: (Room | Section)[]): (Room | Section)[] {
		if (typeof obj === "object" && obj !== null) {
			if ("NOT" in obj) {
				const inverse: (Section | Room)[] = this.runFilter(obj.NOT, onlyID, current);
				return current.filter((section: Room | Section) => !inverse.includes(section));
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
					let builtArray: (Room | Section)[] = [];
					for (const query of or) {
						const filteredSections = this.runFilter(query, onlyID, current).filter(
							(section) => !builtArray.includes(section)
						);

						builtArray = builtArray.concat(filteredSections);
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

	public runMFilter(obj: unknown, current: (Room | Section)[]): (Room | Section)[] {
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
					return current.filter((section: Room | Section) => {
						if (section instanceof Section) {
							return this.mComparisons(comp, section[mkey as keyof Section], mval);
						} else {
							return this.mComparisons(comp, section[mkey as keyof Room], mval);
						}
					});
				} catch {
					throw new InsightError("mkey not found");
				}
			}
		}
		return [];
	}

	public runSMFilter(obj: unknown, current: (Section | Room)[]): (Section | Room)[] {
		if (typeof obj === "object" && obj !== null) {
			if ("IS" in obj) {
				const scomp: unknown = obj.IS;
				if (typeof scomp === "object" && scomp !== null) {
					const skey = Object.keys(scomp)[0].split("_")[1];
					let sval = Object.values(scomp)[0];
					try {
						sval = "^" + sval.replace(/\*/gi, ".*") + "$";
						const regex = new RegExp(sval);
						return current.filter((section: Section | Room) => {
							if (section instanceof Section) {
								return regex.test(section[skey as keyof Section]);
							} else {
								return regex.test(section[skey as keyof Room]);
							}
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
		const ids: string[] = [];
		const results = [];
		for (const filename of await fs.readdir(`${__dirname}/../../data`)) {
			const id: string = filename.split(".")[0];
			ids.push(id);
			results.push(this.getDataset(id));
		}
		const resolved = await Promise.all(results);
		for (let i = 0; i < ids.length; i++) {
			const data = resolved[i];
			let kind: InsightDatasetKind;

			if (data.length > 0 && "fullname" in data[0]) {
				kind = InsightDatasetKind.Rooms;
			} else {
				kind = InsightDatasetKind.Sections;
			}

			const dataset: InsightDataset = {
				id: ids[i],
				kind: kind,
				numRows: resolved[i].length,
			};
			datasets.push(dataset);
		}
		return datasets;
	}
}
