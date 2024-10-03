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

	private readonly tier_eighty_five: number | null;
	private readonly tier_ninety: number | null;
	private readonly tier_seventy_two: number | null;
	private readonly tier_sixty_four: number | null;
	private readonly tier_seventy_six: number | null;
	private readonly tier_thirty: number | null;
	private readonly tier_fifty: number | null;
	private readonly tier_forty: number | null;
	private readonly tier_twenty: number | null;
	private readonly tier_ten: number | null;

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
		tier_eighty_five: number | null,
		tier_ninety: number | null,
		tier_seventy_two: number | null,
		tier_sixty_four: number | null,
		tier_seventy_six: number | null,
		tier_thirty: number | null,
		tier_fifty: number | null,
		tier_forty: number | null,
		tier_twenty: number | null,
		tier_ten: number | null
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
		this.tier_eighty_five = tier_eighty_five;
		this.tier_ninety = tier_ninety;
		this.tier_seventy_two = tier_seventy_two;
		this.tier_sixty_four = tier_sixty_four;
		this.tier_seventy_six = tier_seventy_six;
		this.tier_thirty = tier_thirty;
		this.tier_fifty = tier_fifty;
		this.tier_forty = tier_forty;
		this.tier_twenty = tier_twenty;
		this.tier_ten = tier_ten;
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

			const tier_eighty_five = course.Tier_eighty_five ?? null;
			const tier_ninety = course.Tier_ninety ?? null;
			const tier_seventy_two = course.Tier_seventy_two ?? null;
			const tier_sixty_four = course.Tier_sixty_four ?? null;
			const tier_seventy_six = course.Tier_seventy_six ?? null;
			const tier_thirty = course.Tier_thirty ?? null;
			const tier_fifty = course.Tier_fifty ?? null;
			const tier_forty = course.Tier_forty ?? null;
			const tier_twenty = course.Tier_twenty ?? null;
			const tier_ten = course.Tier_ten ?? null;

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
				tier_eighty_five,
				tier_ninety,
				tier_seventy_two,
				tier_sixty_four,
				tier_seventy_six,
				tier_thirty,
				tier_fifty,
				tier_forty,
				tier_twenty,
				tier_ten
			);
		} catch (error) {
			console.error("Error creating section: ", error);
			return null;
		}
	}
}
