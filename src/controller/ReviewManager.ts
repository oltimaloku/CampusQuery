import { InsightError, NotFoundError } from "./IInsightFacade";
import * as fs from "fs-extra";

export default class ReviewManager {
	private static instance: ReviewManager; // Singleton instance

	private readonly filePath: string = `${__dirname}/../../data/room_reviews.json`;
	private roomReviews: { [roomName: string]: [number, number] } = {};

	private constructor() {}

	// Get singleton instance of ReviewManager
	public static getInstance(): ReviewManager {
		if (!ReviewManager.instance) {
			ReviewManager.instance = new ReviewManager();
		}
		return ReviewManager.instance;
	}

	// Load all room reviews into memory
	public async loadRoomReviews(): Promise<void> {
		try {
			const exists = await fs.pathExists(this.filePath);
			if (exists) {
				this.roomReviews = await fs.readJSON(this.filePath);
			} else {
				this.roomReviews = {};
			}
		} catch {
			this.roomReviews = {};
		}
	}

	// Save room reviews to the JSON file
	public async saveRoomReviews(): Promise<void> {
		try {
			await fs.writeJSON(this.filePath, this.roomReviews, { spaces: 2 });
		} catch (err) {
			throw new InsightError(`Failed to save reviews: ${err}`);
		}
	}

	// Fetch the review of a specific room
	public getReview(roomFullname: string): [number, number] {
		if (!(roomFullname in this.roomReviews)) {
			throw new NotFoundError(`No reviews found for room: ${roomFullname}`);
		}
		return this.roomReviews[roomFullname];
	}

	// Update the review of a specific room
	public updateReview(roomFullname: string, review: number): void {
		if (!(roomFullname in this.roomReviews)) {
			this.roomReviews[roomFullname] = [0, 0];
		}

		const [currentSum, currentCount] = this.roomReviews[roomFullname];
		this.roomReviews[roomFullname] = [currentSum + review, currentCount + 1];
	}

	// Initialize review entry for a room if it doesn't exist
	public initializeReview(roomFullname: string): void {
		if (!(roomFullname in this.roomReviews)) {
			this.roomReviews[roomFullname] = [0, 0];
		}
	}
}
