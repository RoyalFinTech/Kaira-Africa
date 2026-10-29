import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type TimeZoneSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const FALLBACK_TIME_ZONES = [
  "Africa/Banjul",
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Dakar",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Pacific/Auckland"
];

function supportedTimeZones(): string[] {
  const intlWithZones = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  const zones = typeof intlWithZones.supportedValuesOf === "function"
    ? intlWithZones.supportedValuesOf("timeZone")
    : FALLBACK_TIME_ZONES;
  return [...new Set(["Africa/Banjul", ...zones])].sort((a, b) => a.localeCompare(b));
}

function zoneLabel(timeZone: string): string {
  const cityLabel = timeZone.replace(/_/g, " ").replace(/\//g, " — ");
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date()).find(part => part.type === "timeZoneName")?.value;
    return offset ? `${cityLabel} (${offset.replace(/^GMT/, "UTC")})` : cityLabel;
  } catch {
    return cityLabel;
  }
}

/** Searchable IANA selector; options come from the browser's time-zone database where supported. */
export function TimeZoneSelect({ id, value, onChange, disabled = false, className = "" }: TimeZoneSelectProps) {
  const [search, setSearch] = useState("");
  const allZones = useMemo(() => {
    const zones = supportedTimeZones();
    if (value && !zones.includes(value)) zones.push(value);
    return zones.map(zone => ({ value: zone, label: zoneLabel(zone) }));
  }, [value]);
  const options = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = query
      ? allZones.filter(zone => zone.value.toLocaleLowerCase().includes(query) || zone.label.toLocaleLowerCase().includes(query))
      : allZones;
    if (value && !filtered.some(zone => zone.value === value)) {
      const selected = allZones.find(zone => zone.value === value);
      return selected ? [selected, ...filtered] : filtered;
    }
    return filtered;
  }, [allZones, search, value]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search city, country or IANA zone…"
        aria-label="Search time zones"
        disabled={disabled}
      />
      <select
        id={id}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        aria-label="Time zone"
      >
        {options.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
        {options.length === 0 && <option value={value} disabled>No matching time zones</option>}
      </select>
      <p className="text-xs text-muted-foreground">
        {options.length} matching time zone{options.length === 1 ? "" : "s"} · offsets reflect current time-zone rules and may change seasonally.
      </p>
    </div>
  );
}
