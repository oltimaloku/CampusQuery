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
export function isFilter(obj: unknown, idVal: string, mfields: string[], sfields: string[]): Boolean {
	if (typeof obj === "object" && obj !== null) {
		//console.log(Object.keys(obj));
		if (Object.keys(obj).length !== 1) {
			return false;
		}
		// Validate NOT
		if ("NOT" in obj) {
			return isFilter(obj.NOT, idVal, mfields, sfields);
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
						return !isFilter(item, idVal, mfields, sfields);
					});
				}
			}
			return false;
		} else {
			return isSMComp(obj, mfields, sfields, idVal);
		}
	}
	return true;
}

export function validateCols(cols: unknown, mfields: string[], sfields: string[], applykeys: string[]): string[] {
	let onlyID: string;
	const keySections = 2;
	if (Array.isArray(cols)) {
		if (cols.length === 0 || typeof cols[0] !== "string") {
			throw new InsightError("Incorrect format");
		}
		if (applykeys.length > 0) {
			onlyID = applykeys[0].split("_")[0];
		} else {
			onlyID = cols[0].split("_")[0];
		}
		for (const val of cols) {
			if (typeof val === "string") {
				//console.log(val);
				if (val.split("_", keySections)[0] !== onlyID) {
					throw new InsightError("More than one id");
				}
				if (val.split("_", keySections).length < keySections) {
					throw new InsightError("No cols after underscore");
				}
				if (applykeys.length > 0) {
					if (!applykeys.includes(val)) {
						throw new InsightError("Not a valid key");
					}
				} else {
					if (!mfields.includes(val.split("_", keySections)[1]) && !sfields.includes(val.split("_", keySections)[1])) {
						throw new InsightError("Not a key");
					}
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
	} else if (typeof order === "object" && order !== null) {
		if ("dir" in order && "keys" in order) {
			if ((order.dir === 'UP') || (order.dir === 'DOWN')) {
				if (Array.isArray(order.keys)) {
					if (order.keys.every((element) => colVals.includes(element))) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

export function validateWhere(where: unknown, idVal: string, mfields: string[], sfields: string[]): Boolean {
	if (!isEmpty(where) && !isFilter(where, idVal, mfields, sfields)) {
		return false;
	}
	return true;
}

export function validateQuery(query: unknown): Boolean {
	const mfields: string[] = MFIELDS;
	const sfields: string[] = SFIELDS;
	const maxQueryKeys = 2;
	let where: unknown = {};
	let options: unknown = {};
	let applykeys: string[] = [];
	// Check query has body and options
	try{
		if (typeof query === "object" && query && "WHERE" in query && "OPTIONS" in query) {
			where = query.WHERE;
			options = query.OPTIONS;
		} else {
			return false;
		}
		let colVals: string[];
		let idVal: string = '';
		if (typeof options === "object" && options !== null && Object.keys(query).length <= maxQueryKeys) {
			if ("COLUMNS" in options) {
				const cols = options.COLUMNS;
				if ("TRANSFORMATIONS" in query) {
					applykeys = validateTransformations(query.TRANSFORMATIONS, mfields, sfields);
				}
				colVals = validateCols(cols, mfields, sfields, applykeys);
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
		if (applykeys.length > 0) {
			idVal = applykeys[0].split('_')[0];
		} else {
			idVal = colVals[0].split('_')[0];
		}
		return validateWhere(where, idVal, mfields, sfields);
	} catch {
		return false;
	}
}

export function validateTransformations(transformations: unknown, mfields: string[], sfields: string[]): string[] {
	let retArray: string[] = []
	if (typeof transformations === "object" && transformations !== null) {
		if ("GROUP" in transformations && "APPLY" in transformations) {
			if (Array.isArray(transformations.GROUP) && Array.isArray(transformations.APPLY)) {
				const group = transformations.GROUP;
				const apply = transformations.APPLY;
				retArray = validateGroup(group, mfields, sfields)
				return retArray.concat(validateApply(apply, mfields, sfields, retArray[0].split('_')[0]));
			}
		}
	}
	throw new InsightError("Invalid transformation");
}

export function validateGroup(group: unknown[], mfields: string[], sfields: string[]): string[] {
	const keySections = 2;
	if (group.length === 0) {
		throw new InsightError("Invalid grouping");
	}
	if (typeof group[0] !== 'string') {
		throw new InsightError("Invalid grouping");
	}
	const onlyID: string = group[0].split('_')[0];
	for (const val of group) {
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
	return group as string[];
}

export function validateApply(apply: unknown[], mfields: string[], sfields: string[], onlyID: string): string[] {
	let retVal: string[] = [];
	for (const item of apply) {
		retVal.push(validateApplyRule(item, mfields, sfields, onlyID));
	}
	if ((new Set(retVal)).size === retVal.length) {
		throw new InsightError('Duplicate keys');
	}
	return retVal;
}

export function validateApplyRule(item: unknown, mfields: string[], sfields: string[], onlyID: string): string {
	if (typeof item === 'object' && item !== null) {
		if (Object.keys(item).length === 1) {
			const key = Object.keys(item)[0]
			if (!key.includes('_')) {
				if (Object.values(item).length === 1) {
					if (validateApplyToken(Object.values(item)[0], mfields, sfields, onlyID)) {
						return key
					}
				}
			}
		}
	}
	throw new InsightError('Apply Rule invalid');
}

export function validateApplyToken(item: unknown, mfields: string[], sfields: string[], onlyID: string): boolean {
	const keySections = 2;
	const applyTokens: string[] = ['MAX', 'MIN', 'AVG', 'COUNT', 'SUM'];
	if (typeof item === 'object' && item !== null) {
		if (Object.keys(item).length === 1) {
			if (applyTokens.includes(Object.keys(item)[0])) {
				if (Object.values(item).length === 1) {
					const key: unknown = Object.values(item)[0];
					if (typeof key === 'string') {
						if (key.split("_", keySections)[0] === onlyID) {
							if (key.split("_", keySections).length === keySections) {
								if (mfields.includes(key.split("_", keySections)[1]) || sfields.includes(key.split("_", keySections)[1])) {
									return true;
								}
							}
						}
					}
				}
			}
		}
	}
	return false;
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

export const MFIELDS = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
export const SFIELDS = [
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
