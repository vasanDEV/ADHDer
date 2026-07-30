import { makeStyles, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "32px 40px",
    gap: "24px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  titleGroup: { display: "flex", flexDirection: "column", gap: "4px" },
  title: { fontSize: "28px", fontWeight: 600, lineHeight: 1.15, color: tokens.colorNeutralForeground1 },
  subtitle: { fontSize: "14px", color: tokens.colorNeutralForeground2 },
  body: { flex: 1, minHeight: 0 },
});

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        {actions}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
