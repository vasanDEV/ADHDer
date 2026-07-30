import { makeStyles, Text, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "24px 28px",
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  titleGroup: { display: "flex", flexDirection: "column", gap: "2px" },
  subtitle: { color: tokens.colorNeutralForeground3 },
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
          <Text size={700} weight="semibold">
            {title}
          </Text>
          {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
        </div>
        {actions}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
