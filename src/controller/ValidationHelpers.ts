import { InsightError } from "./IInsightFacade";

export function isSCOMP(filter: unknown, sfields: string[], idVal: string): Boolean {
	const keySections = 2;
	const match = new RegExp("^[*]?[^*]*[*]?$");
	if (typeof filter === "object" && filter !== null) {
		if (Object.keys(filter).length === 1) {
			const skey: string = Object.keys(filter)[0];
			if (skey.split("_").length === keySections) {
				const splitKey: string[] = skey.split("_");
				if (splitKey[0] !== idVal) {
					return false;
				}
				if (!sfields.includes(splitKey[1])) {
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
		if (Object.values(filter).length === 1 && typeof Object.values(filter)[0] === "string") {
			const sval: string = Object.values(filter)[0];
			return match.test(sval);
		}
	}
	return false;
}

export function isMCOMP(filter: unknown, mfields: string[], idVal: string): Boolean {
	const keySections = 2;
	if (typeof filter === "object" && filter !== null) {
		if (Object.keys(filter).length === 1) {
			const mkey: string = Object.keys(filter)[0];
			if (mkey.split("_").length === keySections) {
				const splitKey: string[] = mkey.split("_");
				if (splitKey[0] !== idVal) {
					return false;
				}
				if (!mfields.includes(splitKey[1])) {
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
		if (Object.values(filter).length === 1 && typeof Object.values(filter)[0] === "number") {
			return true;
		}
	}
	return false;
}

export function isSMComp(filter: unknown, mfields: string[], sfields: string[], idVal: string): Boolean {
	if (typeof filter === "object" && filter !== null) {
		if ("IS" in filter) {
			const scomp: unknown = filter.IS;
			return isSCOMP(scomp, sfields, idVal);
		}
		if ("LT" in filter) {
			const mcomp: unknown = filter.LT;
			return isMCOMP(mcomp, mfields, idVal);
		}
		if ("GT" in filter) {
			const mcomp: unknown = filter.GT;
			return isMCOMP(mcomp, mfields, idVal);
		}
		if ("EQ" in filter) {
			const mcomp: unknown = filter.EQ;
			return isMCOMP(mcomp, mfields, idVal);
		}
		return false;
	}
	return false;
}

// Recursive check if it is a filter
export function isFilter(obj: unknown, colVals: string[], mfields: string[], sfields: string[]): Boolean {
	if (typeof obj === "object" && obj !== null) {
		//console.log(Object.keys(obj));
		if (Object.keys(obj).length !== 1) {
			return false;
		}
		// Validate NOT
		if ("NOT" in obj) {
			return isFilter(obj.NOT, colVals, mfields, sfields);
		}

		// Validate AND and OR the same way
		if ("AND" in obj || "OR" in obj) {
			// Check if the value is an array
			if (Object.values(obj).length === 1) {
				const val = Object.values(obj)[0];
				if (Array.isArray(val)) {
					if (val.length < 1) {
						return false;
					}
					// Check that no object is not a filter
					return !val.some((item) => {
						return !isFilter(item, colVals, mfields, sfields);
					});
				}
			}
			return false;
		} else {
			const idVal: string = colVals[0].split("_")[0];
			return isSMComp(obj, mfields, sfields, idVal);
		}
	}
	return true;
}

export function validateCols(cols: unknown, mfields: string[], sfields: string[]): string[] {
	let onlyID: string;
	const keySections = 2;
	if (Array.isArray(cols)) {
		if (cols.length === 0 || typeof cols[0] !== "string") {
			throw new InsightError("Incorrect format");
		}
		onlyID = cols[0].split("_")[0];
		for (const val of cols) {
			if (typeof val === "string") {
				//console.log(val);
				if (val.split("_", keySections)[0] !== onlyID) {
					throw new InsightError("More than one id");
				}
				if (val.split("_", keySections).length < keySections) {
					throw new InsightError("No cols after underscore");
				}
				if (!mfields.includes(val.split("_", keySections)[1]) && !sfields.includes(val.split("_", keySections)[1])) {
					throw new InsightError("Not a key");
				}
			} else {
				throw new InsightError("Not a string");
			}
		}
		return cols;
	} else {
		throw new InsightError("Incorrect col format");
	}
}

// Check for {}
export function isEmpty(obj: unknown): Boolean {
	if (typeof obj === "object" && obj !== null) {
		return Object.keys(obj).length === 0;
	}
	return false;
}

export function validateOrder(order: unknown, colVals: string[]): Boolean {
	if (typeof order === "string") {
		if (colVals.includes(order)) {
			return true;
		}
	}
	return false;
}

export function validateWhere(where: unknown, colVals: string[], mfields: string[], sfields: string[]): Boolean {
	if (!isEmpty(where) && !isFilter(where, colVals, mfields, sfields)) {
		return false;
	}
	return true;
}

export function validateQuery(query: unknown): Boolean {
	const mfields: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
	const sfields: string[] = [
		"dept",
		"id",
		"instructor",
		"title",
		"uuid",
		"fullname",
		"shortname",
		"number",
		"name",
		"address",
		"type",
		"furniture",
		"href",
	];
	const maxQueryKeys = 2;
	let where: unknown = {};
	let options: unknown = {};
	// Check query has body and options
	if (typeof query === "object" && query && "WHERE" in query && "OPTIONS" in query) {
		where = query.WHERE;
		options = query.OPTIONS;
	} else {
		return false;
	}
	let colVals: string[];
	if (typeof options === "object" && options !== null && Object.keys(query).length <= maxQueryKeys) {
		if ("COLUMNS" in options) {
			const cols = options.COLUMNS;
			colVals = validateCols(cols, mfields, sfields);
		} else {
			return false;
		}
		if ("ORDER" in options) {
			const order: unknown = options.ORDER;
			if (!validateOrder(order, colVals)) {
				return false;
			}
		}
	} else {
		return false;
	}
	// Validate where
	return validateWhere(where, colVals, mfields, sfields);
}

export interface OptionResult {
	onlyID: string;
	colVals: string[];
	orderField: string;
}

export const requiredFields: Record<string, string> = {
	id: "number",
	Course: "string",
	Title: "string",
	Professor: "string",
	Subject: "string",
	Year: "string",
	Avg: "number",
	Pass: "number",
	Fail: "number",
	Audit: "number",
};
