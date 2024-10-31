import Decimal from "decimal.js";
import { InsightError, InsightResult } from "./IInsightFacade";
import Room from "./Room";
import Section from "./Section";
import { MFIELDS, SFIELDS, TransformInterface, validateTransformations } from "./ValidationHelpers";

export const DECIMALS = 2;
export const MAX_RESULTS = 5000;

export interface TransformationAssignment {
	transformation: TransformInterface | null;
	applyKeys: string[];
}

export function assignTransformation(query: unknown): TransformationAssignment {
	let applyKeys: string[] = [];
	let transformation: TransformInterface | null = null;
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
	return { transformation, applyKeys };
}

export function sortField(results: InsightResult[], fields: string[], ascending: boolean): InsightResult[] {
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

export function applyRecords(grouped: (Section | Room)[][], colVals: string[], applyRules: unknown[]): InsightResult[] {
	return grouped.map((grp: (Section | Room)[]) => {
		const result: InsightResult = {};
		const rules = new Map<string, string | number>();
		for (const rule of applyRules) {
			if (typeof rule === "object" && rule) {
				rules.set(Object.keys(rule)[0], applyRule(grp, Object.values(rule)[0]));
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

export function applyRule(grp: (Section | Room)[], rule: unknown): string | number {
	if (rule && typeof rule === "object") {
		const func: string = Object.keys(rule)[0];
		const field: string = Object.values(rule)[0].split("_")[1];
		switch (func) {
			case "MAX":
				if (MFIELDS.includes(field)) {
					return Math.max(...grp.map((item) => item[field as keyof (Section | Room)]));
				}
				break;
			case "MIN":
				if (MFIELDS.includes(field)) {
					return Math.min(...grp.map((item) => item[field as keyof (Section | Room)]));
				}
				break;
			case "AVG":
				if (MFIELDS.includes(field)) {
					return calcAverage(field, grp);
				}
				break;
			case "SUM":
				if (MFIELDS.includes(field)) {
					return Number(grp.reduce((a, b) => a + b[field as keyof (Section | Room)], 0).toFixed(DECIMALS));
				}
				break;
			case "COUNT":
				return new Set(grp.map((item) => item[field as keyof (Room | Section)])).size;
		}
	}
	throw new InsightError("Not correct field type for apply");
}

export function calcAverage(func: string, grp: (Room | Section)[]): number {
	let total = new Decimal(0);
	for (const item of grp) {
		total = Decimal.add(total, new Decimal(item[func as keyof (Section | Room)]));
	}
	const avg = total.toNumber() / grp.length;
	return Number(avg.toFixed(DECIMALS));
}

export function groupRecords(results: (Section | Room)[], fields: string[]): (Section | Room)[][] {
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

export function mapResults(results: (Section | Room)[], colVals: string[]): InsightResult[] {
	return results.map((section: Room | Section) => {
		const result: InsightResult = {};
		for (const colKey of colVals) {
			const field = colKey.split("_")[1] as keyof (Section | Room);
			result[colKey] = section[field];
		}
		return result;
	});
}
