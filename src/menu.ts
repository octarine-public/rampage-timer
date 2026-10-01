import { Paths } from "./paths"

/** The rows the old screen-percentage placement kept: the card is dragged into place now. */
const LegacyRows = ["Position X (%)", "Position Y (%)"]
/** Where the card stands until it is dragged: centred near the top of the screen, in dp. */
const DefaultX = 872
const DefaultY = 132
/** Whose streaks the timer follows, in the order the row offers them. */
export const enum EAudience {
	Me = 0,
	Allies = 1,
	Enemies = 2
}

/** Drops what the old placement saved, which no row reads any more. */
function dropLegacy(stored: Nullable<MenuSDK.ConfigObject>): void {
	if (stored === undefined) {
		return
	}
	for (const row of LegacyRows) {
		delete stored[row]
	}
}

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly Audience: Menu.MultiSelect
	public readonly OnlyUltra: Menu.Toggle
	public readonly ShowIcon: Menu.Toggle
	/** The card's place and size: dragged on screen, sized with the one row it keeps. */
	public readonly Overlay: MenuSDK.OverlayMenu

	private readonly node: Menu.Node

	constructor() {
		this.node = Menu.AddEntry("Visual").AddNode(
			"Rampage Timer",
			`${Paths.Icons}/stopwatch.svg`,
			"Time left to extend a multi-kill"
		)
		this.node.SortNodes = false
		MenuSDK.AddConfigMigration(raw => dropLegacy(MenuSDK.ConfigSubtreeOf(raw, this.node.entry)))
		dropLegacy(this.node.entry.stored)

		this.State = this.node.AddToggle("State", true, undefined, -1, Menu.Icons.Power)
		this.node.HeaderControl = this.State
		this.node.Gate = this.State
		this.Audience = this.node.AddMultiSelect(
			"Show for",
			["Me", "Allies", "Enemies"],
			["Me"],
			"Whose multi-kills to follow"
		)
		this.Audience.IconPath = `${Paths.Icons}/users.svg`
		this.OnlyUltra = this.node.AddToggle(
			"Only before Rampage",
			true,
			"Show timer only at 4 kills (Ultra Kill)",
			-1,
			Menu.Icons.Hourglass
		)
		this.ShowIcon = this.node.AddToggle(
			"Show icon",
			true,
			"Show the hero's icon next to the streak",
			-1,
			Menu.Icons.IconJuggernaut
		)
		this.Overlay = new MenuSDK.OverlayMenu(this.node, DefaultX, DefaultY)
	}

	/** Whether the page is open, which is when the card stands for placing without a streak. */
	public get IsOpen(): boolean {
		return MenuSDK.MenuManager.IsOpen && this.node.IsOpen
	}
	public Follows(audience: EAudience): boolean {
		return this.Audience.IsSelected(audience)
	}
}
