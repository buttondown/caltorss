import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://caltorss.com"),
	title: "caltorss - Convert ICS Calendar to RSS Feed",
	description:
		"Free tool to convert ICS calendar files into RSS feeds. Perfect for tracking calendar events, schedules, and appointments in your RSS reader.",
	keywords: [
		"ICS",
		"RSS",
		"calendar",
		"feed",
		"convert",
		"iCal",
		"events",
		"schedule",
		"appointments",
	],
	authors: [{ name: "caltorss" }],
	creator: "caltorss",
	publisher: "caltorss",
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://caltorss.com/",
		siteName: "caltorss",
		title: "caltorss - Convert ICS Calendar to RSS Feed",
		description:
			"Free tool to convert ICS calendar files into RSS feeds. Perfect for tracking calendar events, schedules, and appointments in your RSS reader.",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "caltorss - ICS to RSS Converter Tool",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		site: "@caltorss",
		creator: "@caltorss",
		title: "caltorss - Convert ICS Calendar to RSS Feed",
		description:
			"Free tool to convert ICS calendar files into RSS feeds. Perfect for tracking calendar events, schedules, and appointments in your RSS reader.",
		images: ["/og-image.png"],
	},
	alternates: {
		canonical: "https://caltorss.com/",
	},
	category: "Technology",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: "caltorss",
		url: "https://caltorss.com/",
		description:
			"Free tool to convert ICS calendar files into RSS feeds. Perfect for tracking calendar events, schedules, and appointments in your RSS reader.",
		applicationCategory: "WebApplication",
		operatingSystem: "Web Browser",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
		},
		featureList: [
			"Convert ICS to RSS",
			"Real-time preview",
			"Compressed URL generation",
			"Load existing converted feeds",
		],
	};

	return (
		<html lang="en">
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#10b981" />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(structuredData),
					}}
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{children}
				<Analytics />
			</body>
		</html>
	);
}