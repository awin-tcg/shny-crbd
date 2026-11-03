"use client";

import type { Card } from "@cardboard/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money, variantLabel } from "../lib/format";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AddLotForm({
  card,
  defaultVariantId,
  onVariantChange,
}: {
  card: Card;
  defaultVariantId?: string;
  onVariantChange?: (variantId: string) => void;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    defaultVariantId ?? card.variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCard() {
    const parsedQuantity = Number(quantity);
    const dollars = Number(cost);
    if (
      !variantId ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 1 ||
      !Number.isFinite(dollars) ||
      dollars < 0
    ) {
      setStatus("Enter a valid quantity and total cost.");
      return;
    }
    setSaving(true);
    setStatus("Adding…");
    try {
      const response = await fetch(`${apiUrl}/v1/lots`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
          "x-mock-user-id": "demo-user",
        },
        body: JSON.stringify({
          cardId: card.id,
          variantId,
          quantity: parsedQuantity,
          purchaseDate: new Date().toISOString().slice(0, 10),
          totalCostCents: Math.round(dollars * 100),
        }),
      });
      if (!response.ok) throw new Error("Could not add card");
      setStatus("Added to your portfolio.");
      router.refresh();
    } catch {
      setStatus("Could not add this card. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const selected = card.variants.find((variant) => variant.id === variantId);

  return (
    <div className="add-lot-form">
      <label>
        Variant
        <select
          value={variantId}
          onChange={(event) => {
            setVariantId(event.target.value);
            onVariantChange?.(event.target.value);
          }}
        >
          {card.variants.map((variant) => (
            <option value={variant.id} key={variant.id}>
              {variantLabel(variant.descriptor)} ·{" "}
              {variant.marketCents === null
                ? "Unpriced"
                : money(variant.marketCents)}
            </option>
          ))}
        </select>
      </label>
      {selected?.stale && (
        <p className="price-warning" role="note">
          Stale price · this card will remain unpriced in portfolio totals.
        </p>
      )}
      <div className="add-lot-fields">
        <label>
          Quantity
          <input
            inputMode="numeric"
            min="1"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label>
          Total cost (USD)
          <input
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            placeholder="0.00"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
        </label>
      </div>
      <button onClick={addCard} disabled={saving || !variantId} type="button">
        {saving ? "Adding…" : "Add to portfolio"}
      </button>
      <p className="subtle" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
