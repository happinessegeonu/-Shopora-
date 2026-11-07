"use client";

import { useEffect, useState } from "react";
import { storeCatalog } from "@/lib/store-client";

export type ShippingRate = { state: string; fee_minor: number };

export function useShippingRates() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { rates: data } = await storeCatalog();
        if (active) {
          setRates(data ?? []);
          if (!data?.length) setError("Delivery rates are being updated. Please check back before placing your order.");
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "We couldn’t load delivery options.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  return { rates, loading, error };
}
