import { NextRequest, NextResponse } from "next/server";

const buildLocationLabel = (address: Record<string, string | undefined>) => {
  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state;
  const country = address.country;

  return [locality, country].filter(Boolean).join(", ");
};

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, message: "Latitude and longitude are required" },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Xprex/1.0 (profile-location)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to reverse geocode location" },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const location = buildLocationLabel(payload.address ?? {});

    return NextResponse.json({
      success: true,
      data: {
        location,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Location lookup failed" },
      { status: 500 },
    );
  }
}
