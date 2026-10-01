import { MenuManager } from "./menu"

/** One streak on the card: whose it is, what it is called and how much of its window is left. */
export interface IStreakRow {
	hero: Nullable<Unit>
	name: string
	remaining: number
	fraction: number
}

/** The streak's colour while most of its window is left, then past two thirds, then the last third. */
const Plenty = new Color(50, 220, 50)
const Half = new Color(255, 200, 0)
const Last = new Color(255, 50, 50)

/** Space between two streaks stacked in a column, in dp. */
const ROW_GAP = 4
const NAME_SIZE = 12
const TIME_SIZE = 13
const ICON_SIZE = 18
const ICON_GAP = 6
const BAR_HEIGHT = 2
/** A glass strip per streak: its name, the seconds left and a hairline along the bottom edge. */
const CARD_WIDTH = 172
const CARD_HEIGHT = 30
const CARD_RADIUS = 8
const CARD_PAD = 10

/**
 * Which edge of the screen a panel keeps when it grows: the left one in the left third, its centre in
 * the middle third, the right one in the right third. A card centred on the screen stays centred.
 */
function alignOf(center: number, extent: number): number {
	if (center < extent / 3) {
		return 0
	}
	return center > (extent * 2) / 3 ? 1 : 0.5
}

/** The streaks being run down: a column of glass strips, one per streak. */
export class RampageGUI {
	private readonly size = new Vector2()
	private readonly box = new Rectangle()
	private readonly pos = new Vector2()
	private readonly barPos = new Vector2()
	private readonly barSize = new Vector2()
	private readonly panel: MenuSDK.OverlayPanel
	/** The point of the panel that holds still while it is resized, in px, and which point it is. */
	private readonly anchor = new Vector2()
	private readonly align = new Vector2()
	/** The size the panel was last drawn at, and the place it was last moved to for it, in px. */
	private readonly lastSize = new Vector2()
	private readonly placed = new Vector2()
	private anchored = false
	private rows: readonly IStreakRow[] = []
	private icons = false

	private readonly drawContent = (origin: Vector2) => {
		const step = MenuSDK.hudH(CARD_HEIGHT + ROW_GAP)
		for (let index = 0; index < this.rows.length; index++) {
			this.drawCard(this.rows[index], index, origin.x, origin.y + index * step)
		}
	}

	constructor(private readonly menu: MenuManager) {
		this.panel = new MenuSDK.OverlayPanel(menu.Overlay, "hud-rampage-timer", MenuSDK.EPanelLife.MenuBound)
	}

	/** Draws the streaks, or samples of them while the page is open to place the panel. */
	public Draw(rows: readonly IStreakRow[], icons: boolean): void {
		this.rows = rows
		this.icons = icons
		MenuSDK.setHudScale(this.panel.Scale)
		this.size.SetVector(MenuSDK.hudW(CARD_WIDTH), MenuSDK.hudH(rows.length * CARD_HEIGHT + (rows.length - 1) * ROW_GAP))
		this.place()
		this.panel.Draw(this.size, this.drawContent)
	}
	public MouseKeyDown(key: VMouseKeys): boolean {
		return this.panel.MouseKeyDown(key)
	}
	public MouseKeyUp(key: VMouseKeys): boolean {
		return key !== VMouseKeys.MK_LBUTTON || this.panel.MouseKeyUp()
	}
	public Reset(): void {
		this.panel.Reset()
	}

	/**
	 * Keeps the panel's anchor where it stands while its size changes - a pulled size row, a streak
	 * joining or leaving - so a card set in the middle of the screen grows out of its middle instead of
	 * out of its left edge. The anchor is taken again whenever the panel was moved by anything else.
	 */
	private place(): void {
		const overlay = this.menu.Overlay,
			position = overlay.Position,
			size = this.size,
			moved =
				!this.anchored ||
				this.panel.Dragging ||
				Math.abs(position.x - this.placed.x) > 1 ||
				Math.abs(position.y - this.placed.y) > 1
		if (moved) {
			this.align.SetVector(
				alignOf(position.x + size.x / 2, MenuSDK.ViewportWidth()),
				alignOf(position.y + size.y / 2, MenuSDK.ViewportHeight())
			)
			this.anchor.SetVector(position.x + size.x * this.align.x, position.y + size.y * this.align.y)
			this.placed.CopyFrom(position)
			this.anchored = true
		} else if (size.x !== this.lastSize.x || size.y !== this.lastSize.y) {
			overlay.Position = new Vector2(
				MenuSDK.ToLayoutUnits(this.anchor.x - size.x * this.align.x),
				MenuSDK.ToLayoutUnits(this.anchor.y - size.y * this.align.y)
			)
			this.placed.CopyFrom(overlay.Position)
		}
		this.lastSize.CopyFrom(size)
	}

	private drawCard(row: IStreakRow, index: number, x: number, y: number): void {
		const width = MenuSDK.hudW(CARD_WIDTH),
			height = MenuSDK.hudH(CARD_HEIGHT),
			radius = MenuSDK.hudW(CARD_RADIUS),
			barH = MenuSDK.hudH(BAR_HEIGHT),
			centerY = y + (height - barH) / 2,
			color = MenuSDK.HudColors.readable(this.colorOf(row.fraction))
		this.box.pos1.SetVector(x, y)
		this.box.pos2.SetVector(x + width, y + height)
		MenuSDK.HudCard.Frame(this.box, MenuSDK.hudAlpha(), CARD_RADIUS, index)
		const left = this.drawIcon(row, x + MenuSDK.hudW(CARD_PAD), centerY)
		MenuSDK.HudText.Left(left, centerY, row.name, NAME_SIZE, color, MenuSDK.HudBold)
		MenuSDK.HudText.Right(
			x + width - MenuSDK.hudW(CARD_PAD),
			centerY,
			`${row.remaining.toFixed(1)}s`,
			TIME_SIZE,
			MenuSDK.HudColors.body,
			MenuSDK.HudBold
		)
		this.barPos.SetVector(x + radius, y + height - barH * 2)
		this.barSize.SetVector(width - radius * 2, barH)
		MenuSDK.HudCard.Bar(this.barPos, this.barSize, row.fraction, color)
	}
	/** The hero's round icon at `x`, when the menu shows icons; answers where the text starts. */
	private drawIcon(row: IStreakRow, x: number, centerY: number): number {
		const path = this.icons ? row.hero?.TexturePath(true) : undefined
		if (path === undefined) {
			return x
		}
		const icon = MenuSDK.hudW(ICON_SIZE)
		this.pos.SetVector(x, centerY - icon / 2)
		this.barSize.SetVector(icon, icon)
		MenuSDK.HudCard.Image(path, this.pos, this.barSize, Color.White, MenuSDK.hudAlpha(), icon / 2, 0, "cover")
		return x + icon + MenuSDK.hudW(ICON_GAP)
	}
	private colorOf(fraction: number): Color {
		if (fraction > 2 / 3) {
			return Plenty
		}
		return fraction > 1 / 3 ? Half : Last
	}
}
