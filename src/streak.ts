/** How long after a kill the next one still counts towards the same multi-kill, in seconds. */
export const STREAK_WINDOW = 18
/** The kill that makes a rampage, and every one after it while the streak holds. */
const RAMPAGE = 5
/** What the game calls a streak of each length, from one kill to a rampage. */
const STREAK_NAMES = ["KILL", "DOUBLE KILL", "TRIPLE KILL", "ULTRA KILL", "RAMPAGE!"]

/** A hero's multi-kill: how many kills it holds and when the last of them landed. */
export class KillStreak {
	private kills = 0
	private lastKill = 0

	/** Counts a kill at `time`, starting over when the one before it fell out of the window. */
	public Add(time: number): void {
		if (this.Remaining(time) <= 0) {
			this.kills = 0
		}
		this.kills++
		this.lastKill = time
	}
	/** Seconds left at `time` for the next kill to extend the streak; nothing left once it is over. */
	public Remaining(time: number): number {
		return this.kills === 0 ? 0 : Math.max(STREAK_WINDOW - (time - this.lastKill), 0)
	}
	/** The kills the streak holds at `time`: none once its window has closed. */
	public Kills(time: number): number {
		return this.Remaining(time) > 0 ? this.kills : 0
	}
	/** What the game calls the streak as it stands. */
	public get Name(): string {
		return STREAK_NAMES[Math.min(Math.max(this.kills, 1), RAMPAGE) - 1]
	}
	public Reset(): void {
		this.kills = 0
		this.lastKill = 0
	}
}
