import {
  Card,
  Dropdown,
  Field,
  Input,
  makeStyles,
  Option,
  SpinButton,
  Switch,
  Text,
  tokens,
} from "@fluentui/react-components";

import { Page } from "@/components/layout/Page";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThemePreference } from "@/types";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
    alignContent: "start",
    overflowY: "auto",
    height: "100%",
    paddingBottom: "8px",
  },
  card: { padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  sectionTitle: { color: tokens.colorNeutralForeground1 },
  row: { display: "flex", gap: "12px" },
  colorRow: { display: "flex", alignItems: "center", gap: "12px" },
});

export function SettingsPage() {
  const styles = useStyles();
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    void updateSettings({ [key]: value } as Partial<typeof settings>);

  const num = (value: number | undefined, display: string, fallback: number) =>
    value ?? (Number(display) || fallback);

  return (
    <Page title="Settings" subtitle="Everything is stored locally and autosaves.">
      <div className={styles.grid}>
        <Card className={styles.card}>
          <Text weight="semibold" size={400} className={styles.sectionTitle}>
            Appearance
          </Text>
          <Field label="Theme">
            <Dropdown
              value={settings.theme}
              selectedOptions={[settings.theme]}
              onOptionSelect={(_, d) => set("theme", d.optionValue as ThemePreference)}
            >
              <Option value="light">Light</Option>
              <Option value="dark">Dark</Option>
              <Option value="system">System</Option>
            </Dropdown>
          </Field>
        </Card>

        <Card className={styles.card}>
          <Text weight="semibold" size={400} className={styles.sectionTitle}>
            Clock
          </Text>
          <Field label="Time format">
            <Dropdown
              value={settings.clock24Hour ? "24 hour" : "12 hour"}
              selectedOptions={[settings.clock24Hour ? "24" : "12"]}
              onOptionSelect={(_, d) => set("clock24Hour", d.optionValue === "24")}
            >
              <Option value="24">24 hour</Option>
              <Option value="12">12 hour</Option>
            </Dropdown>
          </Field>
          <Switch
            checked={settings.showSeconds}
            label="Show seconds"
            onChange={(_, d) => set("showSeconds", d.checked)}
          />
        </Card>

        <Card className={styles.card}>
          <Text weight="semibold" size={400} className={styles.sectionTitle}>
            Pomodoro
          </Text>
          <div className={styles.row}>
            <Field label="Work (min)" style={{ flex: 1 }}>
              <SpinButton
                min={1}
                max={180}
                value={settings.workDuration}
                onChange={(_, d) =>
                  set("workDuration", num(d.value ?? undefined, d.displayValue ?? "", 25))
                }
              />
            </Field>
            <Field label="Short break" style={{ flex: 1 }}>
              <SpinButton
                min={1}
                max={60}
                value={settings.shortBreak}
                onChange={(_, d) =>
                  set("shortBreak", num(d.value ?? undefined, d.displayValue ?? "", 5))
                }
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Long break" style={{ flex: 1 }}>
              <SpinButton
                min={1}
                max={90}
                value={settings.longBreak}
                onChange={(_, d) =>
                  set("longBreak", num(d.value ?? undefined, d.displayValue ?? "", 15))
                }
              />
            </Field>
            <Field label="Long break interval" style={{ flex: 1 }}>
              <SpinButton
                min={1}
                max={12}
                value={settings.longBreakInterval}
                onChange={(_, d) =>
                  set("longBreakInterval", num(d.value ?? undefined, d.displayValue ?? "", 4))
                }
              />
            </Field>
          </div>
          <Switch
            checked={settings.autoStartNext}
            label="Automatically start next session"
            onChange={(_, d) => set("autoStartNext", d.checked)}
          />
          <Switch
            checked={settings.notificationSound}
            label="Play notification sound"
            onChange={(_, d) => set("notificationSound", d.checked)}
          />
          <div className={styles.colorRow}>
            <Text>Completion color</Text>
            <input
              type="color"
              value={settings.completionColor}
              onChange={(e) => set("completionColor", e.target.value)}
              style={{ width: 48, height: 32, border: "none", background: "none" }}
            />
          </div>
        </Card>

        <Card className={styles.card}>
          <Text weight="semibold" size={400} className={styles.sectionTitle}>
            Data
          </Text>
          <Field label="Autosave interval (seconds)">
            <SpinButton
              min={1}
              max={60}
              value={settings.autosaveInterval}
              onChange={(_, d) =>
                set("autosaveInterval", num(d.value ?? undefined, d.displayValue ?? "", 3))
              }
            />
          </Field>
          <Field label="Database location" hint="Restart the app after changing.">
            <Input
              value={settings.databaseLocation}
              placeholder="~/.adhder/adhder.db"
              onChange={(_, d) => set("databaseLocation", d.value)}
            />
          </Field>
          <Field label="Export location">
            <Input
              value={settings.exportLocation}
              placeholder="~/Documents/ADHDer"
              onChange={(_, d) => set("exportLocation", d.value)}
            />
          </Field>
        </Card>
      </div>
    </Page>
  );
}
