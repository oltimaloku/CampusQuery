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
		audit: number
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
	}

	public static createSection(course: any): Section | null {
		const requiredFields: Record<string, string> = {
			id: "number",
			Course: "string",
			Title: "string",
			Professor: "string",
			Subject: "string",
			Year: "string",
			Avg: "number",
			Pass: "number",
			Fail: "number",
			Audit: "number"
		};

		// Check for the presence and type of each required field
		for (const [field, type] of Object.entries(requiredFields)) {
			if (!(field in course) || typeof course[field] !== type) {
				return null;
			}
		}

		return new Section(
			course.id,
			course.Course,
			course.Title,
			course.Professor,
			course.Subject,
			course.Year,
			course.Avg,
			course.Pass,
			course.Fail,
			course.Audit
		);
	}
}
