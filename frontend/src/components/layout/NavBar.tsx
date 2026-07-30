import { makeStyles, mergeClasses, Text, tokens, Tooltip } from "@fluentui/react-components";
import {
  BoardRegular,
  CalendarLtrRegular,
  ClockRegular,
  HomeRegular,
  NotebookRegular,
  SettingsRegular,
  TimerRegular,
} from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    width: "68px",
    paddingTop: "12px",
    paddingBottom: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    userSelect: "none",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    marginBottom: "8px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    width: "56px",
    height: "52px",
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: "none",
    fontSize: "20px",
    cursor: "pointer",
    transition: "background-color 120ms ease, color 120ms ease",
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
  active: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  label: { fontSize: "10px" },
});

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: <HomeRegular /> },
  { to: "/pomodoro", label: "Focus", icon: <TimerRegular /> },
  { to: "/tasks", label: "Tasks", icon: <BoardRegular /> },
  { to: "/planner", label: "Planner", icon: <CalendarLtrRegular /> },
  { to: "/notes", label: "Notes", icon: <NotebookRegular /> },
  { to: "/settings", label: "Settings", icon: <SettingsRegular /> },
];

export function NavBar() {
  const styles = useStyles();
  return (
    <nav className={styles.root} aria-label="Primary">
      <div className={styles.brand} title="ADHDer">
        <ClockRegular fontSize={22} />
      </div>
      {ITEMS.map((item) => (
        <Tooltip key={item.to} content={item.label} relationship="label" positioning="after">
          <NavLink
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              mergeClasses(styles.item, isActive && styles.active)
            }
          >
            {item.icon}
            <Text className={styles.label}>{item.label}</Text>
          </NavLink>
        </Tooltip>
      ))}
    </nav>
  );
}
