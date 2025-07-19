"use client";

import LZString from "lz-string";
import { useEffect, useState } from "react";

type CalendarEvent = {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  location?: string;
  url?: string;
  uid?: string;
};

export default function Home() {
  const [icsUrl, setIcsUrl] = useState<string>("");
  const [convertedUrl, setConvertedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [previewEvents, setPreviewEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const sampleCalendars = [
    {
      name: "US Holidays",
      url: "https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics",
    },
    {
      name: "Phases of the Moon",
      url: "https://calendar.google.com/calendar/ical/ht3jlfaac5lfd6263ulfh4tql8%40group.calendar.google.com/public/basic.ics",
    },
    {
      name: "Week Numbers",
      url: "https://calendar.google.com/calendar/ical/e_2_en%23weeknum%40group.v.calendar.google.com/public/basic.ics",
    },
  ];

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchPreview = async () => {
    if (!isValidUrl(icsUrl)) {
      setPreviewEvents([]);
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Compress ICS URL using LZ-string
      const compressedUrl = LZString.compressToEncodedURIComponent(icsUrl);

      const response = await fetch(`/api/convert?ics=${compressedUrl}`);
      if (!response.ok) {
        throw new Error("Failed to fetch preview");
      }

      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const items = Array.from(xmlDoc.querySelectorAll("item"))
        .slice(0, 25)
        .map((item) => {
          const getTextContent = (tagName: string) =>
            item.querySelector(tagName)?.textContent || undefined;

          // Parse the title to extract date and event name
          const title = getTextContent("title");
          let eventTitle = title;
          let eventDate = getTextContent("pubDate");

          // Extract event details from description if available
          const description = getTextContent("description");

          return {
            title: eventTitle,
            description: description,
            start: eventDate,
            url: getTextContent("link"),
            uid: getTextContent("guid"),
          };
        });

      setPreviewEvents(items);
      setConvertedUrl(
        `${window.location.origin}/api/convert?ics=${compressedUrl}`
      );
    } catch (error) {
      console.error("Error fetching preview:", error);
      setPreviewEvents([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isValidUrl(icsUrl)) {
      const timeoutId = setTimeout(() => {
        fetchPreview();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    setPreviewEvents([]);
  }, [icsUrl]);

  return (
    <div className="min-h-screen bg-neutral-100 font-sans p-0">
      <div className="flex flex-col lg:flex-row">
        <div className="max-w-prose p-8 space-y-8">
          <div className="">
            <h1 className="text-lg font-extrabold font-sans text-white p-2 mb-2 leading-[20px] bg-green-500 inline-flex items-center gap-1">
              <div className="opacity-100">CAL</div>
              <div className="opacity-60">TO</div>
              <div className="opacity-100">RSS</div>
            </h1>
            <p className="text-sm font-sans text-gray-500">
              Convert ICS calendar files into RSS feeds
            </p>
          </div>

          <div className="bg-neutral-300/20 p-4 rounded-md border border-neutral-300">
            <h2 className="font-semibold text-gray-800">Add your ICS URL</h2>
            <p className="text-sm text-gray-600 mb-2">
              Enter the URL of an ICS calendar file
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={icsUrl}
                onChange={(e) => {
                  setIcsUrl(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="https://example.com/calendar.ics"
                className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 font-mono bg-white"
              />
            </div>
          </div>

          <div className="">
            <h2 className="font-semibold text-gray-800">How do I use this?</h2>
            <p className="text-gray-600">
              Put the URL of an ICS calendar file in the box above; browse the
              preview to make sure it's what you want; hit the button to get a
              permalink (that's a compressed URL of the calendar, so no real
              worry about bitrot).
            </p>
          </div>

          <div className="">
            <h2 className="font-semibold text-gray-800">
              Why would I want to do this?
            </h2>
            <p className="text-gray-600">
              Many RSS readers and services work better with RSS feeds than
              calendar files. This tool converts your calendar events into an
              RSS feed format that can be consumed by any RSS reader.
            </p>
          </div>

          <div className="">
            <h2 className="font-semibold text-gray-800">
              What calendars are supported?
            </h2>
            <p className="text-gray-600">
              Any publicly accessible ICS/iCal file should work, including
              Google Calendar, Outlook, Apple Calendar exports, and more.
            </p>
          </div>

          <div className="">
            <h2 className="font-semibold text-gray-800">Who built this?</h2>
            <p className="text-gray-600">
              Your friends at{" "}
              <a
                href="https://buttondown.com?utm_source=caltorss"
                className="text-green-600 hover:text-green-800"
              >
                Buttondown
              </a>
              , and they even made it{" "}
              <a
                href="https://github.com/buttondown/caltorss"
                className="text-green-600 hover:text-green-800"
              >
                open source
              </a>
              .
            </p>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 border border-red-300 rounded-md bg-red-50 text-red-700">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
        <div className="flex-1" />

        <div className="hidden lg:block">
          <div className="flex h-[calc(100vh)] overflow-y-hidden p-8 pb-0 sticky top-0">
            <div className="mx-auto shadow-2xl border border-neutral-300 rounded-md rounded-b-none bg-white w-[600px] overflow-y-scroll">
              {icsUrl.length > 0 && (
                <div className="grid grid-cols-3 p-2 pb-1 border-b border-neutral-300 shadow-sm sticky top-0 bg-white">
                  <div className="flex items-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 text-center">
                    Calendar Feed
                  </h3>
                  <div className="text-right">
                    <a
                      href={convertedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 inline-flex items-center whitespace-nowrap font-semibold text-xs bg-green-200 px-1.5 py-[2px] rounded-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      Get RSS feed
                    </a>
                  </div>
                </div>
              )}

              {isLoadingPreview ? (
                <div className="space-y-0">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="border border-gray-100 text-sm odd:bg-neutral-100/50 p-2 border-b border-b-neutral-300 animate-pulse"
                    >
                      <div className="h-5 bg-gray-300 rounded w-3/4 mb-2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded" />
                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                      </div>
                      <div className="flex justify-between mt-2">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : previewEvents.length > 0 ? (
                <div className="">
                  {previewEvents.map((event, index) => (
                    <div
                      key={index}
                      className="border border-gray-100 text-sm odd:bg-neutral-50 p-2 max-w-full border-b border-b-neutral-300"
                    >
                      <h4 className="font-semibold text-gray-900 truncate">
                        {event.url ? (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-green-600"
                          >
                            {event.title || "Untitled Event"}
                          </a>
                        ) : (
                          event.title || "Untitled Event"
                        )}
                      </h4>
                      <div className="flex-1">
                        {event.description && (
                          <p className="text-sm text-gray-600 line-clamp-4 break-normal">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between mt-2 text-xs">
                        <div className="flex items-center">
                          <span className="text-lg mr-1">📅</span>
                          <p className="text-gray-500">Calendar Event</p>
                        </div>
                        {event.start && (
                          <p className="text-gray-500">
                            {new Date(event.start).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No calendar added yet
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Add an ICS calendar URL to see a preview of your RSS feed
                  </p>

                  <div className="space-y-3 w-full">
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                      Try a sample calendar:
                    </p>
                    {sampleCalendars.map((calendar, index) => (
                      <button
                        key={index}
                        onClick={() => setIcsUrl(calendar.url)}
                        className="w-full px-4 py-3 text-sm text-left border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-semibold text-gray-800">
                          {calendar.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Public calendar
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Preview Section - Shown only on small screens */}
        <div className="lg:hidden p-8 pt-0">
          <div className="mx-auto shadow-2xl border border-neutral-300 rounded-md bg-white max-h-96 overflow-y-scroll">
            {icsUrl.length > 0 && (
              <div className="grid grid-cols-3 p-2 pb-1 border-b border-neutral-300 shadow-sm sticky top-0 bg-white">
                <div className="flex items-center">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 text-center">
                  Calendar Feed
                </h3>
                <div className="text-right">
                  <a
                    href={convertedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 inline-flex items-center whitespace-nowrap font-semibold text-xs bg-green-200 px-1.5 py-[2px] rounded-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="size-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Get RSS feed
                  </a>
                </div>
              </div>
            )}

            {isLoadingPreview ? (
              <div className="space-y-0">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className="border border-gray-100 text-sm odd:bg-neutral-100/50 p-2 border-b border-b-neutral-300 animate-pulse"
                  >
                    <div className="h-5 bg-gray-300 rounded w-3/4 mb-2" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="h-3 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : previewEvents.length > 0 ? (
              <div className="">
                {previewEvents.map((event, index) => (
                  <div
                    key={index}
                    className="border border-gray-100 text-sm odd:bg-neutral-50 p-2 max-w-full border-b border-b-neutral-300"
                  >
                    <h4 className="font-semibold text-gray-900 truncate">
                      {event.url ? (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-green-600"
                        >
                          {event.title || "Untitled Event"}
                        </a>
                      ) : (
                        event.title || "Untitled Event"
                      )}
                    </h4>
                    <div className="flex-1">
                      {event.description && (
                        <p className="text-sm text-gray-600 line-clamp-4 break-normal">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <div className="flex items-center">
                        <span className="text-lg mr-1">📅</span>
                        <p className="text-gray-500">Calendar Event</p>
                      </div>
                      {event.start && (
                        <p className="text-gray-500">
                          {new Date(event.start).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No calendar added yet
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Add an ICS calendar URL to see a preview of your RSS feed
                </p>

                <div className="space-y-3 w-full">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                    Try a sample calendar:
                  </p>
                  {sampleCalendars.map((calendar, index) => (
                    <button
                      key={index}
                      onClick={() => setIcsUrl(calendar.url)}
                      className="w-full px-4 py-3 text-sm text-left border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold text-gray-800">
                        {calendar.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Public calendar
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
