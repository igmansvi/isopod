"use client";

import { useEffect, useRef } from "react";
import { useStore, type UserSession } from "@/lib/store";

interface StoreInitializerProps {
  user: UserSession | null;
}

/**
 * @description Injects the server-fetched session into the Zustand global store.
 * @param props.user - The user session object.
 */
export function StoreInitializer({ user }: StoreInitializerProps) {
  // Sync the server-fetched session into the global store.
  // Using useEffect ensures we don't trigger state updates on subscribers
  // while React is still actively rendering this component.
  useEffect(() => {
    useStore.setState({ user });
  }, [user]);

  return null;
}
