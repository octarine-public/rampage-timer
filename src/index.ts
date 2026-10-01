import "./translations"

import { IStreakRow, RampageGUI } from "./gui"
import { EAudience, MenuManager } from "./menu"
import { KillStreak, STREAK_WINDOW } from "./streak"

/** The streak a row has to reach to be shown while only the last kill before a rampage is. */
const ULTRA_KILLS = 4
/** What each audience shows while the page is open and none of it is running: kills, seconds left. */
const Samples: [EAudience, number, number][] = [
	[EAudience.Me, 4, 12],
	[EAudience.Allies, 3, 7.5],
	[EAudience.Enemies, 2, 3.2]
]

function streakOf(kills: number): KillStreak {
	const streak = new KillStreak()
	for (let kill = 0; kill < kills; kill++) {
		streak.Add(0)
	}
	return streak
}

/** The real hero a kill belongs to: the killer itself, or whoever owns the illusion or summon that landed it. */
function heroOf(entity: Nullable<Entity>): Nullable<Hero> {
	for (let depth = 0; entity !== undefined && depth < 3; depth++) {
		if (entity instanceof Hero && entity.IsRealHero) {
			return entity
		}
		if (entity instanceof Player) {
			return entity.Hero
		}
		entity = entity.Owner
	}
	return undefined
}

new (class CRampageTimer {
	private readonly menu = new MenuManager()
	private readonly gui = new RampageGUI(this.menu)
	/** Every hero's multi-kill, by the player who holds it, and the hero to show it for. */
	private readonly streaks = new Map<number, KillStreak>()
	private readonly heroes = new Map<number, Hero>()
	private readonly rows: IStreakRow[] = []
	private readonly pool: IStreakRow[] = []
	private readonly samples = Samples.map(([, kills, remaining]) => ({
		streak: streakOf(kills),
		ultra: streakOf(Math.max(kills, ULTRA_KILLS)),
		remaining
	}))
	private local: Nullable<Hero>
	private readonly byOrder = (a: IStreakRow, b: IStreakRow): number => {
		if ((a.hero === this.local) !== (b.hero === this.local)) {
			return a.hero === this.local ? -1 : 1
		}
		return a.remaining - b.remaining
	}

	constructor() {
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
		this.collect()
		if (this.rows.length === 0 && this.menu.IsOpen) {
			this.collectSamples()
		}
		if (this.rows.length === 0) {
			this.gui.Reset()
			return
		}
		this.gui.Draw(this.rows, this.menu.ShowIcon.value)
	}
	protected GameEvent(name: string, event: IEntityKilledEvent): void {
		if (name !== "entity_killed" || !this.menu.State.value) {
			return
		}
		const killed = EntityManager.EntityByIndex(event.entindex_killed)
		if (!(killed instanceof Hero) || !killed.IsRealHero) {
			return
		}
		const killer = heroOf(EntityManager.EntityByIndex(event.entindex_attacker))
		if (killer === undefined || !killed.IsEnemy(killer)) {
			return
		}
		let streak = this.streaks.get(killer.PlayerID)
		if (streak === undefined) {
			streak = new KillStreak()
			this.streaks.set(killer.PlayerID, streak)
		}
		this.heroes.set(killer.PlayerID, killer)
		streak.Add(GameState.RawGameTime)
	}
	protected MouseKeyDown(key: VMouseKeys): boolean {
		return this.gui.MouseKeyDown(key)
	}
	protected MouseKeyUp(key: VMouseKeys): boolean {
		return this.gui.MouseKeyUp(key)
	}
	protected GameEnded(): void {
		this.streaks.clear()
		this.heroes.clear()
		this.gui.Reset()
	}

	/** The running streaks the menu follows: the local hero's first, then the closest to running out. */
	private collect(): void {
		const now = GameState.RawGameTime,
			minKills = this.menu.OnlyUltra.value ? ULTRA_KILLS : 1,
			local = LocalPlayer?.Hero
		this.local = local
		this.rows.length = 0
		for (const [player, streak] of this.streaks) {
			const kills = streak.Kills(now),
				hero = this.heroes.get(player)
			if (kills < minKills || hero === undefined || !this.menu.Follows(this.audienceOf(hero, local))) {
				continue
			}
			this.push(hero, streak, streak.Remaining(now))
		}
		this.rows.sort(this.byOrder)
	}
	/** A sample of every audience the menu follows, standing in while the page is open to place it. */
	private collectSamples(): void {
		const local = LocalPlayer?.Hero,
			ultra = this.menu.OnlyUltra.value
		for (let index = 0; index < Samples.length; index++) {
			const audience = Samples[index][0]
			if (this.menu.Follows(audience)) {
				const sample = this.samples[index]
				this.push(this.sampleHero(audience, local), ultra ? sample.ultra : sample.streak, sample.remaining)
			}
		}
	}
	private push(hero: Nullable<Hero>, streak: KillStreak, remaining: number): void {
		let row = this.pool[this.rows.length]
		if (row === undefined) {
			row = { hero, name: "", remaining: 0, fraction: 0 }
			this.pool.push(row)
		}
		row.hero = hero
		row.name = streak.Name
		row.remaining = remaining
		row.fraction = remaining / STREAK_WINDOW
		this.rows.push(row)
	}
	private audienceOf(hero: Hero, local: Nullable<Hero>): EAudience {
		if (hero === local) {
			return EAudience.Me
		}
		return hero.IsEnemy() ? EAudience.Enemies : EAudience.Allies
	}
	/** Some hero from `audience` to show a sample for, so the sample wears a face. */
	private sampleHero(audience: EAudience, local: Nullable<Hero>): Nullable<Hero> {
		if (audience === EAudience.Me || local === undefined) {
			return local
		}
		const heroes = EntityManager.GetEntitiesByClass(Hero)
		for (const hero of heroes) {
			if (hero.IsRealHero && hero !== local && this.audienceOf(hero, local) === audience) {
				return hero
			}
		}
		return local
	}
})()
