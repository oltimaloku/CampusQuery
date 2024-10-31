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
} from "./ValidationHelpers";
import DatasetProcessor from "./DatasetProcessor";
import Room from "./Room";
import {
	applyRecords,
	assignTransformation,
	groupRecords,
	mapResults,
	MAX_RESULTS,
	sortField,
	TransformationAssignment,
} from "./TransformationHelpers";
import { runSMFilter } from "./FilterSpecifics";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, Section[] | Room[]> = new Map<string, Section[] | Room[]>();
	private static readonly MFIELDS = MFIELDS;
	private static readonly SFIELDS = SFIELDS;

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
		let colVals: string[] = [];
		let order: OrderObject | string = "";
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
				order = this.handleOrder(options.ORDER, colVals);
			}
		}
		return { onlyID: onlyID, colVals: colVals, orderField: order };
	}

	private handleOrder(order: unknown, colVals: string[]): OrderObject | string {
		let orderField: string | OrderObject = "";
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
		return orderField;
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

			const transformAssignmnet: TransformationAssignment = assignTransformation(query);
			transformation = transformAssignmnet.transformation;
			const applyKeys = transformAssignmnet.applyKeys;

			const optionsData: OptionResult = this.getOptions(
				options,
				InsightFacade.MFIELDS,
				InsightFacade.SFIELDS,
				applyKeys
			);

			if (transformation) {
				optionsData.onlyID = transformation.group[0].split("_")[0];
			}

			return await this.handlePost(transformation, where, optionsData);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new InsightError("Error performing query: " + error);
			}
			throw error;
		}
	}

	private async handlePost(
		transformation: TransformInterface | null,
		where: unknown,
		optionsData: OptionResult
	): Promise<InsightResult[]> {
		const sections = await this.getDataset(optionsData.onlyID);
		let res: (Section | Room)[] = [];

		if (typeof sections !== "undefined") {
			res = this.runFilter(where, optionsData.onlyID, sections);
		}

		let output: InsightResult[];

		if (res.length > MAX_RESULTS) {
			throw new ResultTooLargeError("Result too large");
		}

		if (transformation) {
			output = applyRecords(groupRecords(res, transformation.group), optionsData.colVals, transformation.apply);
		} else {
			output = mapResults(res, optionsData.colVals);
		}

		if (typeof optionsData.orderField === "string") {
			const orderField: string = optionsData.orderField;
			if (orderField !== "") {
				return sortField(output, [orderField], true);
			}
		} else {
			return sortField(output, optionsData.orderField.keys, optionsData.orderField.dir === "UP");
		}

		return output;
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
			return runSMFilter(obj, current);
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
