import { InsightError } from "./IInsightFacade";
import Room from "./Room";
import Section from "./Section";

export function runMFilter(obj: unknown, current: (Room | Section)[]): (Room | Section)[] {
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
						return mComparisons(comp, section[mkey as keyof Section], mval);
					} else {
						return mComparisons(comp, section[mkey as keyof Room], mval);
					}
				});
			} catch {
				throw new InsightError("mkey not found");
			}
		}
	}
	return [];
}

export function runSMFilter(obj: unknown, current: (Section | Room)[]): (Section | Room)[] {
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
		return runMFilter(obj, current);
	}
	return [];
}

export function mComparisons(comp: string, val: number, mval: number): boolean {
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
