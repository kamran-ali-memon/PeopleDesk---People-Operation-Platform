const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const statusClass = (status) =>
  ["approved", "present", "active", "finalized"].includes(
    String(status).toLowerCase(),
  )
    ? "badge-green"
    : ["pending", "late", "probation", "missing_checkout"].includes(
          String(status).toLowerCase(),
        )
      ? "badge-yellow"
      : ["rejected", "absent", "exited"].includes(String(status).toLowerCase())
        ? "badge-red"
        : "badge-gray";

export { money, shortDate, statusClass };
