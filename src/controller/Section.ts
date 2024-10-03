export default class Section {
	private readonly uuid: number;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;
	private readonly campus: string;
	private readonly course: string;
	private readonly enrolled: number | null;
	private readonly stddev: number | null;
	private readonly withdrew: number | null;
	private readonly high: number | null;
	private readonly low: number | null;

	private readonly tierEightyFive: number | null;
	private readonly tierNinety: number | null;
	private readonly tierSeventyTwo: number | null;
	private readonly tierSixtyFour: number | null;
	private readonly tierSeventySix: number | null;
	private readonly tierThirty: number | null;
	private readonly tierFifty: number | null;
	private readonly tierForty: number | null;
	private readonly tierTwenty: number | null;
	private readonly tierTen: number | null;

	public constructor(
		uuid: number,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number,
		campus: string,
		course: string,
		enrolled: number | null,
		stddev: number | null,
		withdrew: number | null,
		high: number | null,
		low: number | null,
		tierEightyFive: number | null,
		tierNinety: number | null,
		tierSeventyTwo: number | null,
		tierSixtyFour: number | null,
		tierSeventySix: number | null,
		tierThirty: number | null,
		tierFifty: number | null,
		tierForty: number | null,
		tierTwenty: number | null,
		tierTen: number | null
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.campus = campus;
		this.course = course;
		this.enrolled = enrolled;
		this.stddev = stddev;
		this.withdrew = withdrew;
		this.high = high;
		this.low = low;

		// Tiers
		this.tierEightyFive = tierEightyFive;
		this.tierNinety = tierNinety;
		this.tierSeventyTwo = tierSeventyTwo;
		this.tierSixtyFour = tierSixtyFour;
		this.tierSeventySix = tierSeventySix;
		this.tierThirty = tierThirty;
		this.tierFifty = tierFifty;
		this.tierForty = tierForty;
		this.tierTwenty = tierTwenty;
		this.tierTen = tierTen;
	}

	public static createSection(course: any): Section | null {
		try {
			// required fields and their expected types
			const requiredFields: { [key: string]: string } = {
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
				Campus: "string",
			};

			// Check for the presence and type of each required field
			for (const [field, type] of Object.entries(requiredFields)) {
				if (!(field in course)) {
					//console.error(`Field missing: ${field}`);
					return null;
				}
				if (typeof course[field] !== type) {
					//console.error(`Incorrect type for field: ${field}, expected: ${type}, got: ${typeof course[field]}`);
					return null;
				}
			}

			// Proceed to create a new Section instance
			const uuid = course.id;
			const id = course.Course;
			const title = course.Title;
			const instructor = course.Professor;
			const dept = course.Subject;
			const year = course.Year;
			const avg = course.Avg;
			const pass = course.Pass;
			const fail = course.Fail;
			const audit = course.Audit;
			const campus = course.Campus;
			const courseCode = course.Course;
			const enrolled = course.Enrolled ?? null;
			const stddev = course.Stddev ?? null;
			const withdrew = course.Withdrew ?? null;
			const high = course.High ?? null;
			const low = course.Low ?? null;

			const tierEightyFive = course.tierEightyFive ?? null;
			const tierNinety = course.tierNinety ?? null;
			const tierSeventyTwo = course.tierSeventyTwo ?? null;
			const tierSixtyFour = course.tierSixtyFour ?? null;
			const tierSeventySix = course.tierSeventySix ?? null;
			const tierThirty = course.tierThirty ?? null;
			const tierFifty = course.tierFifty ?? null;
			const tierForty = course.tierForty ?? null;
			const tierTwenty = course.tierTwenty ?? null;
			const tierTen = course.tierTen ?? null;

			return new Section(
				uuid,
				id,
				title,
				instructor,
				dept,
				year,
				avg,
				pass,
				fail,
				audit,
				campus,
				courseCode,
				enrolled,
				stddev,
				withdrew,
				high,
				low,
				tierEightyFive,
				tierNinety,
				tierSeventyTwo,
				tierSixtyFour,
				tierSeventySix,
				tierThirty,
				tierFifty,
				tierForty,
				tierTwenty,
				tierTen
			);
		} catch (error) {
			console.error("Error creating section: ", error);
			return null;
		}
	}
}
