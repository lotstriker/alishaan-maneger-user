/* ============================================================
   ALISHAN · CALCULATIONS
   Dozen/piece math + payment status + aging.
   Single source of truth for all money/quantity calculations.
   ============================================================ */

const Calc = (() => {

  const SIZES = [28,30,32,34,36,38,40,42,44,46,48,50];

  function emptyQuantities() {
    const o = {};
    for (const s of SIZES) o[s] = { dozens: 0, pieces: 0 };
    return o;
  }

  function normalizeQuantities(q) {
    const out = {};
    for (const s of SIZES) {
      out[s] = {
        dozens: Math.max(0, Number(q?.[s]?.dozens) || 0),
        pieces: Math.min(11, Math.max(0, Number(q?.[s]?.pieces) || 0)),
      };
    }
    return out;
  }

  /* Which quantity groups to sum for a record */
  function groupsOf(rec) {
    if (!rec) return [emptyQuantities()];
    if (rec.mode === 'different') {
      const byColor = rec.quantitiesByColor || {};
      const names = Array.isArray(rec.colors) ? rec.colors : Object.keys(byColor);
      const vals = names.map(n => byColor[n]).filter(Boolean);
      return vals.length ? vals : [emptyQuantities()];
    }
    return [rec.quantities || emptyQuantities()];
  }

  /* MAIN: compute totals + amount for a record */
  function compute(rec) {
    if (!rec) return { dozenSum: 0, pieceSum: 0, wholeDozen: 0, remainderPieces: 0, totalDozen: 0, amount: 0 };

    const groups = groupsOf(rec);
    let dozenSum = 0, pieceSum = 0;

    for (const g of groups) {
      for (const s of SIZES) {
        const v = g?.[s];
        if (!v) continue;
        dozenSum += Number(v.dozens) || 0;
        pieceSum += Number(v.pieces) || 0;
      }
    }

    const extraDozen = Math.floor(pieceSum / 12);
    const remainderPieces = pieceSum % 12;
    const wholeDozen = dozenSum + extraDozen;
    const totalDozen = wholeDozen + (remainderPieces / 12);
    const rate = Number(rec.priceSnapshot) || 0;
    const amount = Math.round(totalDozen * rate * 100) / 100;

    return { dozenSum, pieceSum, wholeDozen, remainderPieces, totalDozen, amount };
  }

  /* Amount for just one colour's quantities (used in "Different" mode headers) */
  function computeForQuantities(quantities, rate) {
    let dozenSum = 0, pieceSum = 0;
    for (const s of SIZES) {
      const v = quantities?.[s];
      if (!v) continue;
      dozenSum += Number(v.dozens) || 0;
      pieceSum += Number(v.pieces) || 0;
    }
    const totalDozen = dozenSum + Math.floor(pieceSum / 12) + ((pieceSum % 12) / 12);
    return {
      dozenSum, pieceSum,
      wholeDozen: dozenSum + Math.floor(pieceSum / 12),
      remainderPieces: pieceSum % 12,
      totalDozen,
      amount: Math.round(totalDozen * (Number(rate) || 0) * 100) / 100,
    };
  }

  /* Payment helpers */
  function totalReceived(rec, allPayments) {
    if (!rec || !allPayments) return 0;
    return allPayments
      .filter(p => p.recordId === rec.id && !p.archived)
      .reduce((a, p) => a + (Number(p.amount) || 0), 0);
  }

  function paymentStatus(rec, allPayments) {
    if (!rec) return 'na';
    if (!rec.paymentTracked) return 'na';
    const { amount } = compute(rec);
    const received = totalReceived(rec, allPayments);
    if (received <= 0) return 'unpaid';
    if (received + 0.005 >= amount) return 'paid';
    return 'partial';
  }

  function pendingAmount(rec, allPayments) {
    if (!rec || !rec.paymentTracked) return 0;
    const { amount } = compute(rec);
    return Math.max(0, amount - totalReceived(rec, allPayments));
  }

  /* Aging: uses createdAt, NOT entryDate (per blueprint) */
  function agingDays(rec) {
    if (!rec?.createdAt) return 0;
    return Utils.daysBetween(rec.createdAt);
  }

  function isAging(rec) {
    return rec?.status === 'INCOMPLETE' && agingDays(rec) >= 10;
  }

  return {
    SIZES,
    emptyQuantities, normalizeQuantities, groupsOf,
    compute, computeForQuantities,
    totalReceived, paymentStatus, pendingAmount,
    agingDays, isAging,
  };
})();

window.Calc = Calc;