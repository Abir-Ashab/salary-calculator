// timeUtils.js

// Time Parsing
export function parseTimeString(timeStr) {
    const patterns = [
        /^(\d+)h(\d+)m$/,     // 8h30m
        /^(\d+)h$/,           // 8h
        /^(\d+)m$/,           // 30m
        /^(\d+):(\d+)$/,      // 8:30
        /^(\d+)\.(\d+)$/      // 8.5
    ];

    for (const pattern of patterns) {
        const match = timeStr.match(pattern);
        if (match) {
            if (pattern.toString().includes('h') && pattern.toString().includes('m')) {
                return { hours: parseInt(match[1]), minutes: parseInt(match[2]), valid: true };
            } else if (pattern.toString().includes('h')) {
                return { hours: parseInt(match[1]), minutes: 0, valid: true };
            } else if (pattern.toString().includes('m')) {
                return { hours: 0, minutes: parseInt(match[1]), valid: true };
            } else if (pattern.toString().includes(':')) {
                return { hours: parseInt(match[1]), minutes: parseInt(match[2]), valid: true };
            } else if (pattern.toString().includes('\\.')) {
                const hours = parseInt(match[1]);
                const minutes = Math.round(parseFloat(`0.${match[2]}`) * 60);
                return { hours, minutes, valid: true };
            }
        }
    }

    return { hours: 0, minutes: 0, valid: false };
}

// Time Formatting
export function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
