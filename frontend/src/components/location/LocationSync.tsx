"use client";

import { useEffect, useRef } from "react";
import { useGeolocated } from "react-geolocated";
import { useUserStore } from "@/store/userStore";

const coordinateCacheKey = (userId: string) => `location-sync:${userId}`;

export default function LocationSync() {
  const { user, setUser } = useUserStore();
  const lastSyncedCoordinates = useRef<string | null>(null);

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: false,
      maximumAge: 1000 * 60 * 30,
      timeout: 15000,
    },
    userDecisionTimeout: 10000,
    watchLocationPermissionChange: true,
  });

  useEffect(() => {
    if (!user?.id || !coords) return;
    if (!isGeolocationAvailable || !isGeolocationEnabled) return;

    const serializedCoordinates = `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
    const storageKey = coordinateCacheKey(user.id);
    const cachedCoordinates = sessionStorage.getItem(storageKey);

    if (
      cachedCoordinates === serializedCoordinates ||
      lastSyncedCoordinates.current === serializedCoordinates
    ) {
      return;
    }

    let isCancelled = false;

    const syncLocation = async () => {
      try {
        const reverseResponse = await fetch(
          `/api/location/reverse?lat=${coords.latitude}&lon=${coords.longitude}`,
          {
            credentials: "include",
          },
        );

        if (!reverseResponse.ok) return;

        const reversePayload = await reverseResponse.json();
        const location = reversePayload?.data?.location as string | undefined;

        if (!location) return;

        lastSyncedCoordinates.current = serializedCoordinates;
        sessionStorage.setItem(storageKey, serializedCoordinates);

        if (location === user.location) {
          return;
        }

        const updateResponse = await fetch("/api/profile/edit", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ location }),
        });

        if (!updateResponse.ok || isCancelled) return;

        const payload = await updateResponse.json();

        if (payload?.data && !isCancelled) {
          setUser({
            ...user,
            ...payload.data,
          });
        }
      } catch {
        // Non-blocking: profile location can remain unchanged when lookup fails.
      }
    };

    void syncLocation();

    return () => {
      isCancelled = true;
    };
  }, [
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    setUser,
    user,
  ]);

  return null;
}
