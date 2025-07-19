import LZString from "lz-string";
import { type NextRequest, NextResponse } from "next/server";
import ical from "ical";

// Types for calendar events
type CalendarEvent = {
  summary?: string;
  description?: string;
  start?: Date;
  end?: Date;
  location?: string;
  url?: string;
  uid?: string;
  organizer?: string;
  attendees?: string[];
  recurrence?: unknown;
  created?: Date;
  lastModified?: Date;
};

// Helper functions for XML generation
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapCDATA(content: string): string {
  return `<![CDATA[${content}]]>`;
}

// Format date for RSS
function formatRSSDate(date: Date): string {
  return date.toUTCString();
}

// Format event duration
function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0 && diffMinutes > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else if (diffHours > 0) {
    return `${diffHours}h`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  }
  return "";
}

export async function GET(request: NextRequest) {
  // Get the URL parameters
  const searchParams = request.nextUrl.searchParams;
  let icsUrl: string = "";

  // Check for compressed ICS parameter
  const compressedIcs = searchParams.get("ics");
  if (compressedIcs) {
    try {
      // Decompress using LZ-string
      const decompressed =
        LZString.decompressFromEncodedURIComponent(compressedIcs);
      if (!decompressed) {
        throw new Error("Failed to decompress ICS URL");
      }
      icsUrl = decompressed;
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Invalid compressed ICS parameter" },
        { status: 400 }
      );
    }
  } else {
    // Fall back to direct URL parameter
    icsUrl = searchParams.get("url") || "";
  }

  // If no URL <is> provided, return an error
  if (!icsUrl) {
    return NextResponse.json({ error: "No ICS URL provided" }, { status: 400 });
  }

  try {
    // Fetch the ICS file
    const response = await fetch(icsUrl, {
      headers: {
        "User-Agent": "caltorss/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ICS file: ${response.statusText}`);
    }

    const icsData = await response.text();

    // Parse the ICS data
    const parsedData = ical.parseICS(icsData);

    // Extract events and sort by start date
    const events: CalendarEvent[] = [];
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    for (const key in parsedData) {
      const component = parsedData[key];
      if (component.type === "VEVENT") {
        const event: CalendarEvent = {
          summary: component.summary,
          description: component.description,
          start: component.start,
          end: component.end,
          location: component.location,
          url: component.url,
          uid: component.uid,
          organizer:
            typeof component.organizer === "string"
              ? component.organizer
              : undefined,
          attendees: component.attendee
            ? Array.isArray(component.attendee)
              ? component.attendee.map((a: unknown) => {
                  if (typeof a === "string") return a;
                  const attendee = a as {
                    val?: string;
                    params?: { CN?: string };
                  };
                  return attendee.val || attendee.params?.CN || "";
                })
              : [
                  typeof component.attendee === "string"
                    ? component.attendee
                    : "",
                ]
            : undefined,
          created: component.created,
          lastModified: component.lastmodified,
        };

        // Only include future events or events from the last 30 days
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        if (
          event.start &&
          event.start >= thirtyDaysAgo &&
          event.start <= oneYearFromNow
        ) {
          events.push(event);
        }
      }
    }

    // Sort events by start date (newest first for RSS)
    events.sort((a, b) => {
      const dateA = a.start || new Date(0);
      const dateB = b.start || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // Limit to 100 most recent events
    const limitedEvents = events.slice(0, 100);

    // Generate RSS XML
    const items = limitedEvents
      .map((event) => {
        let itemXml = "    <item>\n";

        // Title - include date and time
        const eventDate = event.start
          ? event.start.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";
        const eventTime = event.start
          ? event.start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "";

        const title = `${eventDate}${eventTime ? ` at ${eventTime}` : ""}: ${
          event.summary || "Untitled Event"
        }`;
        itemXml += `      <title>${escapeXml(title)}</title>\n`;

        // Link
        if (event.url) {
          itemXml += `      <link>${escapeXml(event.url)}</link>\n`;
        }

        // GUID
        itemXml += `      <guid isPermaLink="false">${escapeXml(
          event.uid || `${icsUrl}#${event.start?.toISOString()}`
        )}</guid>\n`;

        // Publication date (use event start date)
        if (event.start) {
          itemXml += `      <pubDate>${formatRSSDate(event.start)}</pubDate>\n`;
        }

        // Description - combine all event details
        let description = "";

        if (event.description) {
          description += `${event.description}\n\n`;
        }

        if (event.start && event.end) {
          const duration = formatDuration(event.start, event.end);
          description += `📅 ${event.start.toLocaleString()}`;
          if (duration) {
            description += ` (${duration})`;
          }
          description += "\n";
        }

        if (event.location) {
          description += `📍 ${event.location}\n`;
        }

        if (event.organizer) {
          description += `👤 Organizer: ${event.organizer}\n`;
        }

        if (event.attendees && event.attendees.length > 0) {
          description += `👥 Attendees: ${event.attendees.join(", ")}\n`;
        }

        if (description) {
          itemXml += `      <description>${wrapCDATA(
            description.trim()
          )}</description>\n`;
        }

        // Categories
        itemXml += `      <category>Calendar Event</category>\n`;

        itemXml += "    </item>\n";
        return itemXml;
      })
      .join("");

    // Extract calendar name from the ICS data if available
    let calendarName = "Calendar Feed";
    // The parsed data might contain calendar properties at the root level
    const calData = parsedData as Record<string, unknown>;
    if (
      calData["x-wr-calname"] &&
      typeof calData["x-wr-calname"] === "string"
    ) {
      calendarName = calData["x-wr-calname"];
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(calendarName)}</title>
    <description>${escapeXml(
      `RSS feed generated from ${calendarName} calendar`
    )}</description>
    <link>${escapeXml(request.nextUrl.toString())}</link>
    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>
    <generator>caltorss</generator>
${items}  </channel>
</rss>`;

    // Return the XML response
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "max-age=600, s-maxage=600", // Cache for 10 minutes
      },
    });
  } catch (error) {
    console.error("Error converting ICS to RSS:", error);
    return NextResponse.json(
      { error: "Failed to convert ICS to RSS" },
      { status: 500 }
    );
  }
}
