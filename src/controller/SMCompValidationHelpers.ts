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
