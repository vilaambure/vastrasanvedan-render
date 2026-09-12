const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const PAYMENT_STATES = ["PENDING", "VERIFIED", "FAILED", "MISMATCH", "REVIEW"];
const WEB_PAYMENTS = ["UPI"];
const POS_PAYMENTS = ["CASH", "UPI", "CARD"];

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function amountsMatch(expected, received) {
  return roundMoney(expected) === roundMoney(received);
}

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATES,
  WEB_PAYMENTS,
  POS_PAYMENTS,
  roundMoney,
  amountsMatch,
};
