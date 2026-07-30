import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import {
  CalendarDays,
  House,
  LayoutGrid,
  type LucideIcon,
  NotebookPen,
  Settings2,
  Timer,
  Waves,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const RAIL = "64px";
const EXPANDED = "220px";
const STROKE = 1.75;

const useStyles = makeStyles({
  spacer: { width: RAIL, flexShrink: 0, height: "100%" },
  rail: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: RAIL,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "4px",
    paddingTop: "16px",
    paddingBottom: "16px",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    transition: "width 180ms cubic-bezier(0.4,0,0.2,1), box-shadow 180ms",
    userSelect: "none",
    "--nav-op": "0",
    ":hover": {
      width: EXPANDED,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      "--nav-op": "1",
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    height: "44px",
    paddingLeft: "20px",
    marginBottom: "8px",
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  brandText: {
    fontSize: "17px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap",
    opacity: "var(--nav-op)",
    transform: "translateX(calc((var(--nav-op) - 1) * 6px))",
    transition: "opacity 160ms ease, transform 160ms ease",
  },
  item: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    height: "44px",
    margin: "0 8px",
    paddingLeft: "12px",
    borderRadius: "12px",
    color: tokens.colorNeutralForeground2,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background-color 120ms ease, color 120ms ease",
    ":hover": { backgroundColor: tokens.colorNeutralBackground3 },
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    flexShrink: 0,
  },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    opacity: "var(--nav-op)",
    transform: "translateX(calc((var(--nav-op) - 1) * 6px))",
    transition: "opacity 160ms ease, transform 160ms ease",
  },
  active: {
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  indicator: {
    position: "absolute",
    left: "-8px",
    top: "10px",
    bottom: "10px",
    width: "3px",
    borderRadius: "0 3px 3px 0",
    backgroundColor: tokens.colorBrandForeground1,
  },
});

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItemDef[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/pomodoro", label: "Focus", icon: Timer },
  { to: "/tasks", label: "Tasks", icon: LayoutGrid },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export function NavBar() {
  const styles = useStyles();

  return (
    <>
      <div className={styles.spacer} aria-hidden />
      <nav className={styles.rail} aria-label="Primary navigation">
        <div className={styles.brand}>
          <span className={styles.iconWrap}>
            <Waves size={22} strokeWidth={STROKE} />
          </span>
          <span className={styles.brandText}>ADHDer</span>
        </div>

        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              mergeClasses(styles.item, isActive && styles.active)
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className={styles.indicator} />}
                <span className={styles.iconWrap}>
                  <Icon size={21} strokeWidth={STROKE} />
                </span>
                <span className={styles.label}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
