/**
 * TLE Parser — parse Two-Line Element sets from CelesTrak text format.
 */

export interface TLERecord {
    name: string;
    line1: string;
    line2: string;
}

/**
 * Parse raw CelesTrak TLE text (3-line format) into structured records.
 * Format: name\nline1\nline2\n repeating
 */
export function parseTLE(raw: string): TLERecord[] {
    const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const records: TLERecord[] = [];

    for (let i = 0; i + 2 < lines.length; i += 3) {
        const name = lines[i];
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];

        // Basic validation: line1 starts with "1 ", line2 starts with "2 "
        if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
            records.push({ name, line1, line2 });
        }
    }

    return records;
}
