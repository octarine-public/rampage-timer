import "./translations"

import { RampageGUI } from "./gui"
import { MenuManager } from "./menu"
import { KillStreak, STREAK_WINDOW } from "./streak"

/** The streak the card shows while the page is open and none is running: one kill off a rampage. */
const SAMPLE_KILLS = 4
const SAMPLE_REMAINING = 12

new (class CRampageTimer {
	private readonly menu = new MenuManager()
	private readonly gui = new RampageGUI(this.menu)
	private readonly streak = new KillStreak()
	private readonly sample = new KillStreak()

	constructor() {
		for (let kill = 0; kill < SAMPLE_KILLS; kill++) {
			this.sample.Add(0)
		}
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("GameEvent", this.GameEvent.bind(this))
		EventsSDK.on("GameEnded", this.GameEnded.bind(this))
		InputEventSDK.on("MouseKeyDown", this.MouseKeyDown.bind(this))
		InputEventSDK.on("MouseKeyUp", this.MouseKeyUp.bind(this))
	}

	protected Draw(): void {
		if (!this.menu.State.value) {
			this.gui.Reset()
			return
		}
		const now = GameState.RawGameTime,
			kills = this.streak.Kills(now)
		if (kills !== 0 && (!this.menu.OnlyUltra.value || kills >= SAMPLE_KILLS)) {
			const remaining = this.streak.Remaining(now)
			this.gui.Draw(this.streak.Name, remaining, remaining / STREAK_WINDOW)
			return
		}
		if (this.menu.IsOpen) {
			this.gui.Draw(this.sample.Name, SAMPLE_REMAINING, SAMPLE_REMAINING / STREAK_WINDOW)
			return
		}
		this.gui.Reset()
	}
	protected GameEvent(name: string, event: IEntityKilledEvent): void {
		if (name !== "entity_killed" || !this.menu.State.value) {
			return
		}
		const hero = LocalPlayer?.Hero,
			killed = EntityManager.EntityByIndex(event.entindex_killed)
		if (
			hero === undefined ||
			!(killed instanceof Hero) ||
			!killed.IsRealHero ||
			!killed.IsEnemy() ||
			EntityManager.EntityByIndex(event.entindex_attacker) !== hero
		) {
			return
		}
		this.streak.Add(GameState.RawGameTime)
	}
	protected MouseKeyDown(key: VMouseKeys): boolean {
		return this.gui.MouseKeyDown(key)
	}
	protected MouseKeyUp(key: VMouseKeys): boolean {
		return this.gui.MouseKeyUp(key)
	}
	protected GameEnded(): void {
		this.streak.Reset()
		this.gui.Reset()
	}
})()
