export function getReorderRecommendations(kpis) {
  const list = Array.isArray(kpis) ? kpis : [];
  const MIN_SALES_FOR_REORDER = 1;
  const candidates = list.filter((kpi) => {
    if (kpi?.policy && kpi.policy !== "normal") return false;
    const sales = Number(kpi?.verkaufteMengeTotal) || 0;
    const avgDaily = Number(kpi?.avgDailySales) || 0;
    if (sales < MIN_SALES_FOR_REORDER && avgDaily <= 0) return false;
    return kpi?.needsReorder;
  });

  const recommendations = candidates.map((kpi) => {
    const sales = Number(kpi?.verkaufteMengeTotal) || 0;
    const doc = kpi?.daysOfCover ?? null;
    const st = kpi?.sellThrough ?? 0;

    const scoreTop = kpi?.isTopSeller ? 1 : 0;
    const scoreOOS = kpi?.isOOS ? 1 : 0;
    const scoreDoC = doc == null ? 0 : Math.max(0, (7 - doc) / 7);
    const scoreST = st || 0;

    const priorityScore = 3 * scoreTop + 4 * scoreOOS + 2 * scoreDoC + 1 * scoreST;
    const type = determineType(kpi);

    return {
      ...kpi,
      priorityScore,
      reason: {
        type,
        details: {
          doc,
          sales,
          sellThrough: st,
          lowStock: kpi?.isLowStock === true,
          urgent: kpi?.isUrgent === true,
          topSeller: kpi?.isTopSeller === true,
          topSellerOOS: kpi?.isTopSellerOOS === true,
          criticalQty: kpi?.isCriticalQty === true,
          priorityScore,
        },
      },
    };
  });

  return recommendations.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}

function determineType(kpi) {
  if (kpi?.isTopSeller && kpi?.isOOS) return "urgent";
  if (kpi?.isTopSeller && (kpi?.isUrgent || kpi?.isLowStock)) return "urgent";
  if (kpi?.isOOS || kpi?.isLowStock || kpi?.isUrgent) return "priority";
  return "monitor";
}
